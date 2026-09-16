package com.xtramys.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaCodecList;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.net.Uri;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.nio.ByteBuffer;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "NativeVideoEncoder")
public class NativeVideoEncoderPlugin extends Plugin {
    private static final String MIME_TYPE = "video/avc";
    private static final int TIMEOUT_US = 10_000;
    private final ConcurrentHashMap<String, StreamingSession> sessions = new ConcurrentHashMap<>();

    @PluginMethod
    public void startEncoding(PluginCall call) {
        int width = even(call.getInt("width", 0));
        int height = even(call.getInt("height", 0));
        int fps = Math.max(1, call.getInt("fps", 30));
        int bitrate = call.getInt("bitrate", bitrateFor(width, height));
        if (width < 2 || height < 2) {
            call.reject("Invalid video dimensions");
            return;
        }

        new Thread(() -> {
            try {
                File output = new File(
                        getContext().getCacheDir(),
                        "xtramys_video_" + UUID.randomUUID() + ".mp4"
                );
                StreamingSession session = new StreamingSession(width, height, fps, bitrate, output);
                String sessionId = UUID.randomUUID().toString();
                sessions.put(sessionId, session);
                JSObject result = new JSObject();
                result.put("sessionId", sessionId);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Native video encode failed: " + error.getMessage(), error);
            }
        }).start();
    }

    @PluginMethod
    public void appendFrame(PluginCall call) {
        String sessionId = call.getString("sessionId");
        String data = call.getString("data");
        StreamingSession session = sessions.get(sessionId);
        if (session == null || data == null) {
            call.reject("Video encoding session not found");
            return;
        }
        int index = Math.max(0, call.getInt("index", 0));
        int durationFrames = Math.max(1, call.getInt("durationFrames", 1));
        session.executor.execute(() -> {
            try {
                session.append(data, index, durationFrames);
                call.resolve();
            } catch (Exception error) {
                sessions.remove(sessionId);
                session.cancel();
                call.reject("Native video encode failed: " + error.getMessage(), error);
            }
        });
    }

    @PluginMethod
    public void finishEncoding(PluginCall call) {
        String sessionId = call.getString("sessionId");
        StreamingSession session = sessions.remove(sessionId);
        if (session == null) {
            call.reject("Video encoding session not found");
            return;
        }
        session.executor.execute(() -> {
            try {
                session.finish();
                JSObject result = new JSObject();
                result.put("mimeType", "video/mp4");
                result.put("path", Uri.fromFile(session.output).toString());
                call.resolve(result);
            } catch (Exception error) {
                session.cancel();
                session.output.delete();
                call.reject("Native video encode failed: " + error.getMessage(), error);
            } finally {
                session.executor.shutdown();
            }
        });
    }

    @PluginMethod
    public void cancelEncoding(PluginCall call) {
        String sessionId = call.getString("sessionId");
        StreamingSession session = sessions.remove(sessionId);
        if (session == null) {
            call.resolve();
            return;
        }
        session.executor.execute(() -> {
            session.cancel();
            session.executor.shutdown();
            call.resolve();
        });
    }

    @PluginMethod
    public void encodeFrames(PluginCall call) {
        JSArray frames = call.getArray("frames");
        int fps = call.getInt("fps", 30);
        int speedBitrate = call.getInt("bitrate", 0);

        if (frames == null || frames.length() == 0) {
            call.reject("No frames provided");
            return;
        }

        new Thread(() -> {
            try {
                File output = new File(getContext().getCacheDir(), "xtramys_video_" + System.currentTimeMillis() + ".mp4");
                encodeToMp4(frames, Math.max(1, fps), speedBitrate, output);
                JSObject result = new JSObject();
                result.put("mimeType", "video/mp4");
                result.put("data", readBase64(output));
                output.delete();
                call.resolve(result);
            } catch (Exception e) {
                call.reject("Native video encode failed: " + e.getMessage(), e);
            }
        }).start();
    }

    private void encodeToMp4(JSArray frames, int fps, int requestedBitrate, File output) throws Exception {
        Bitmap first = decodeFrame(frames.getString(0));
        int width = even(first.getWidth());
        int height = even(first.getHeight());
        first.recycle();

        int colorFormat = selectColorFormat();
        MediaFormat format = MediaFormat.createVideoFormat(MIME_TYPE, width, height);
        format.setInteger(MediaFormat.KEY_COLOR_FORMAT, colorFormat);
        format.setInteger(MediaFormat.KEY_BIT_RATE, requestedBitrate > 0 ? requestedBitrate : bitrateFor(width, height));
        format.setInteger(MediaFormat.KEY_FRAME_RATE, fps);
        format.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1);

        MediaCodec encoder = MediaCodec.createEncoderByType(MIME_TYPE);
        MediaMuxer muxer = null;
        try {
            encoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
            encoder.start();
            muxer = new MediaMuxer(output.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);

            EncoderDrain drain = new EncoderDrain(encoder, muxer);
            for (int i = 0; i < frames.length(); i++) {
                int inputIndex = encoder.dequeueInputBuffer(TIMEOUT_US);
                if (inputIndex < 0) {
                    drain.drain(false);
                    i--;
                    continue;
                }

                ByteBuffer input = encoder.getInputBuffer(inputIndex);
                if (input == null) throw new IllegalStateException("Encoder input buffer unavailable");
                input.clear();

                Bitmap bitmap = normalizeFrame(decodeFrame(frames.getString(i)), width, height);
                writeYuv420(bitmap, input, colorFormat);
                bitmap.recycle();

                encoder.queueInputBuffer(
                        inputIndex,
                        0,
                        width * height * 3 / 2,
                        (long) i * 1_000_000L / fps,
                        0
                );
                drain.drain(false);
            }

            int inputIndex;
            do {
                inputIndex = encoder.dequeueInputBuffer(TIMEOUT_US);
                if (inputIndex < 0) drain.drain(false);
            } while (inputIndex < 0);
            encoder.queueInputBuffer(inputIndex, 0, 0, (long) frames.length() * 1_000_000L / fps, MediaCodec.BUFFER_FLAG_END_OF_STREAM);
            drain.drain(true);
        } finally {
            try { encoder.stop(); } catch (Exception ignored) {}
            encoder.release();
            if (muxer != null) {
                try { muxer.stop(); } catch (Exception ignored) {}
                muxer.release();
            }
        }
    }

    private Bitmap decodeFrame(String data) {
        String payload = data;
        int comma = payload.indexOf(',');
        if (comma >= 0) payload = payload.substring(comma + 1);
        byte[] bytes = Base64.decode(payload, Base64.DEFAULT);
        Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (bitmap == null) throw new IllegalArgumentException("Invalid frame");
        return bitmap;
    }

    private Bitmap normalizeFrame(Bitmap source, int width, int height) {
        if (source.getWidth() == width && source.getHeight() == height) return source;
        Bitmap out = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(out);
        canvas.drawColor(Color.BLACK);
        Paint paint = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.DITHER_FLAG);
        canvas.drawBitmap(source, null, new android.graphics.Rect(0, 0, width, height), paint);
        source.recycle();
        return out;
    }

    private void writeYuv420(Bitmap bitmap, ByteBuffer out, int colorFormat) {
        out.put(bitmapToYuv420(bitmap, colorFormat));
    }

    private byte[] bitmapToYuv420(Bitmap bitmap, int colorFormat) {
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        int[] argb = new int[width * height];
        bitmap.getPixels(argb, 0, width, 0, 0, width, height);

        int frameSize = width * height;
        byte[] yuv = new byte[frameSize * 3 / 2];
        int yIndex = 0;
        int uIndex = frameSize;
        int vIndex = colorFormat == MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Planar
                ? frameSize + frameSize / 4
                : frameSize + 1;

        for (int j = 0; j < height; j++) {
            for (int i = 0; i < width; i++) {
                int c = argb[j * width + i];
                int r = (c >> 16) & 0xff;
                int g = (c >> 8) & 0xff;
                int b = c & 0xff;

                int y = ((66 * r + 129 * g + 25 * b + 128) >> 8) + 16;
                int u = ((-38 * r - 74 * g + 112 * b + 128) >> 8) + 128;
                int v = ((112 * r - 94 * g - 18 * b + 128) >> 8) + 128;
                yuv[yIndex++] = (byte) clamp(y);

                if ((j & 1) == 0 && (i & 1) == 0) {
                    if (colorFormat == MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Planar) {
                        yuv[uIndex++] = (byte) clamp(u);
                        yuv[vIndex++] = (byte) clamp(v);
                    } else {
                        yuv[uIndex] = (byte) clamp(u);
                        yuv[vIndex] = (byte) clamp(v);
                        uIndex += 2;
                        vIndex += 2;
                    }
                }
            }
        }
        return yuv;
    }

    private int selectColorFormat() {
        MediaCodecList list = new MediaCodecList(MediaCodecList.REGULAR_CODECS);
        for (MediaCodecInfo info : list.getCodecInfos()) {
            if (!info.isEncoder()) continue;
            for (String type : info.getSupportedTypes()) {
                if (!MIME_TYPE.equalsIgnoreCase(type)) continue;
                MediaCodecInfo.CodecCapabilities caps = info.getCapabilitiesForType(type);
                for (int format : caps.colorFormats) {
                    if (format == MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420SemiPlanar ||
                            format == MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420Planar) {
                        return format;
                    }
                }
            }
        }
        return MediaCodecInfo.CodecCapabilities.COLOR_FormatYUV420SemiPlanar;
    }

    private String readBase64(File file) throws Exception {
        try (FileInputStream input = new FileInputStream(file);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            return Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
        }
    }

    private int even(int value) {
        return value % 2 == 0 ? value : value - 1;
    }

    private int clamp(int value) {
        return Math.max(0, Math.min(255, value));
    }

    private int bitrateFor(int width, int height) {
        double ratio = Math.max(1.0, (width * height) / (1920.0 * 1080.0));
        return (int) Math.max(8_000_000, Math.min(28_000_000, ratio * 14_000_000));
    }

    private final class StreamingSession {
        final ExecutorService executor = Executors.newSingleThreadExecutor();
        final File output;
        final int width;
        final int height;
        final int fps;
        final int colorFormat;
        final MediaCodec encoder;
        final MediaMuxer muxer;
        final EncoderDrain drain;
        int nextFrameIndex = 0;
        boolean closed = false;

        StreamingSession(int width, int height, int fps, int bitrate, File output) throws Exception {
            this.width = width;
            this.height = height;
            this.fps = fps;
            this.output = output;
            colorFormat = selectColorFormat();

            MediaFormat format = MediaFormat.createVideoFormat(MIME_TYPE, width, height);
            format.setInteger(MediaFormat.KEY_COLOR_FORMAT, colorFormat);
            format.setInteger(MediaFormat.KEY_BIT_RATE, bitrate);
            format.setInteger(MediaFormat.KEY_FRAME_RATE, fps);
            format.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1);

            encoder = MediaCodec.createEncoderByType(MIME_TYPE);
            encoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
            encoder.start();
            muxer = new MediaMuxer(output.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            drain = new EncoderDrain(encoder, muxer);
        }

        void append(String data, int index, int durationFrames) throws Exception {
            if (closed) throw new IllegalStateException("Video encoder is closed");
            Bitmap bitmap = normalizeFrame(decodeFrame(data), width, height);
            byte[] yuv;
            try {
                yuv = bitmapToYuv420(bitmap, colorFormat);
            } finally {
                bitmap.recycle();
            }

            nextFrameIndex = Math.max(nextFrameIndex, index);
            for (int repeat = 0; repeat < durationFrames; repeat++) {
                int inputIndex;
                do {
                    inputIndex = encoder.dequeueInputBuffer(TIMEOUT_US);
                    if (inputIndex < 0) drain.drain(false);
                } while (inputIndex < 0);

                ByteBuffer input = encoder.getInputBuffer(inputIndex);
                if (input == null) throw new IllegalStateException("Encoder input buffer unavailable");
                input.clear();
                input.put(yuv);
                encoder.queueInputBuffer(
                        inputIndex,
                        0,
                        yuv.length,
                        (long) nextFrameIndex * 1_000_000L / fps,
                        0
                );
                nextFrameIndex++;
                drain.drain(false);
            }
        }

        void finish() throws Exception {
            if (closed) throw new IllegalStateException("Video encoder is closed");
            int inputIndex;
            do {
                inputIndex = encoder.dequeueInputBuffer(TIMEOUT_US);
                if (inputIndex < 0) drain.drain(false);
            } while (inputIndex < 0);
            encoder.queueInputBuffer(
                    inputIndex,
                    0,
                    0,
                    (long) nextFrameIndex * 1_000_000L / fps,
                    MediaCodec.BUFFER_FLAG_END_OF_STREAM
            );
            drain.drain(true);
            close(false);
        }

        void cancel() {
            close(true);
        }

        private void close(boolean deleteOutput) {
            if (closed) return;
            closed = true;
            try { encoder.stop(); } catch (Exception ignored) {}
            encoder.release();
            try { muxer.stop(); } catch (Exception ignored) {}
            muxer.release();
            if (deleteOutput) output.delete();
        }
    }

    private static class EncoderDrain {
        private final MediaCodec encoder;
        private final MediaMuxer muxer;
        private final MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        private int trackIndex = -1;
        private boolean muxerStarted = false;

        EncoderDrain(MediaCodec encoder, MediaMuxer muxer) {
            this.encoder = encoder;
            this.muxer = muxer;
        }

        void drain(boolean end) {
            while (true) {
                int outputIndex = encoder.dequeueOutputBuffer(info, TIMEOUT_US);
                if (outputIndex == MediaCodec.INFO_TRY_AGAIN_LATER) {
                    if (!end) return;
                } else if (outputIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    if (muxerStarted) throw new IllegalStateException("Format changed twice");
                    trackIndex = muxer.addTrack(encoder.getOutputFormat());
                    muxer.start();
                    muxerStarted = true;
                } else if (outputIndex >= 0) {
                    ByteBuffer output = encoder.getOutputBuffer(outputIndex);
                    if (output == null) throw new IllegalStateException("Encoder output buffer unavailable");
                    if ((info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) info.size = 0;
                    if (info.size > 0) {
                        if (!muxerStarted) throw new IllegalStateException("Muxer has not started");
                        output.position(info.offset);
                        output.limit(info.offset + info.size);
                        muxer.writeSampleData(trackIndex, output, info);
                    }
                    boolean eos = (info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0;
                    encoder.releaseOutputBuffer(outputIndex, false);
                    if (eos) return;
                }
            }
        }
    }
}
