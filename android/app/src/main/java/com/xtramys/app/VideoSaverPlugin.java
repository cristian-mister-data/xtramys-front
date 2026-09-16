package com.xtramys.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.MediaStore.MediaColumns;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

@CapacitorPlugin(name = "VideoSaver")
public class VideoSaverPlugin extends Plugin {

    private static final String TAG = "VideoSaver";
    private static final String CAMERA_PATH = Environment.DIRECTORY_DCIM + "/Camera/";

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("Public Downloads requires the native save sheet on Android 9 or older");
            return;
        }

        String base64Data = call.getString("data");
        String fileName = call.getString("fileName", "xtramys_" + System.currentTimeMillis() + ".pdf");
        String mimeType = call.getString("mimeType", "application/pdf");
        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("No file data provided");
            return;
        }

        new Thread(() -> {
            ContentResolver resolver = getContext().getContentResolver();
            Uri uri = null;
            try {
                String displayName = fileName.replaceAll("[\\\\/:*?\"<>|]", "-");
                ContentValues values = new ContentValues();
                values.put(MediaColumns.DISPLAY_NAME, displayName);
                values.put(MediaColumns.MIME_TYPE, mimeType);
                values.put(MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/");
                values.put(MediaColumns.IS_PENDING, 1);
                uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IllegalStateException("Could not create download");

                byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
                try (OutputStream output = resolver.openOutputStream(uri)) {
                    if (output == null) throw new IllegalStateException("Could not open download");
                    output.write(data);
                }

                values.clear();
                values.put(MediaColumns.IS_PENDING, 0);
                values.put(MediaColumns.SIZE, data.length);
                resolver.update(uri, values, null, null);

                JSObject result = new JSObject();
                result.put("saved", true);
                result.put("uri", uri.toString());
                call.resolve(result);
            } catch (Exception error) {
                if (uri != null) resolver.delete(uri, null, null);
                call.reject("Failed to save download: " + error.getMessage(), error);
            }
        }).start();
    }

    private void scanCameraFile(String displayName, String mimeType) {
        File file = new File(getCameraDir(), displayName);
        MediaScannerConnection.scanFile(
                getContext(),
                new String[]{file.getAbsolutePath()},
                new String[]{mimeType},
                null);
    }

    private File getCameraDir() {
        return new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DCIM), "Camera");
    }

    private void putCameraVideoMetadata(ContentValues values) {
        values.put(MediaColumns.RELATIVE_PATH, CAMERA_PATH);
    }

    /**
     * Downloads a video from a URL and saves it directly to the device gallery.
     * Uses native HttpURLConnection to avoid base64 corruption issues.
     * Streams directly to MediaStore OutputStream for memory efficiency.
     */
    @PluginMethod
    public void saveToGallery(PluginCall call) {
        String videoUrl = call.getString("url");
        String sourceUri = call.getString("sourceUri");
        String base64Data = call.getString("data");
        String fileName = call.getString("fileName", "video_" + System.currentTimeMillis());
        String mimeType = call.getString("mimeType", "video/mp4");

        // Run on background thread to avoid blocking the main thread
        bridge.getActivity().runOnUiThread(() -> {});
        new Thread(() -> {
            try {
                if (videoUrl != null && !videoUrl.isEmpty()) {
                    // Preferred: download from URL natively (no base64 corruption)
                    saveFromUrl(call, videoUrl, fileName, mimeType);
                } else if (sourceUri != null && !sourceUri.isEmpty()) {
                    saveFromUri(call, sourceUri, fileName, mimeType);
                } else if (base64Data != null && !base64Data.isEmpty()) {
                    // Fallback: decode base64 data
                    byte[] decoded = Base64.decode(base64Data, Base64.DEFAULT);
                    saveBytes(call, decoded, fileName, mimeType);
                } else {
                    call.reject("No video URL or data provided");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error saving video", e);
                call.reject("Failed to save video: " + e.getMessage());
            }
        }).start();
    }

    private void saveFromUri(PluginCall call, String sourceUri, String fileName, String mimeType) {
        try (InputStream inputStream = getContext().getContentResolver().openInputStream(Uri.parse(sourceUri))) {
            if (inputStream == null) {
                call.reject("Failed to open local video");
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                streamToMediaStore(call, inputStream, fileName, mimeType);
            } else {
                streamToLegacy(call, inputStream, fileName, mimeType);
            }
        } catch (Exception e) {
            Log.e(TAG, "Local video error", e);
            call.reject("Failed to save local video: " + e.getMessage());
        }
    }

    /**
     * Downloads video from URL and streams directly to gallery.
     * No base64 intermediate step — binary-safe and memory efficient.
     */
    private void saveFromUrl(PluginCall call, String videoUrl, String fileName, String mimeType) {
        HttpURLConnection connection = null;
        InputStream inputStream = null;

        try {
            URL url = new URL(videoUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(60000);
            connection.setInstanceFollowRedirects(true);
            connection.connect();

            int responseCode = connection.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                call.reject("Download failed with HTTP " + responseCode);
                return;
            }

            // Detect mime type from response if not provided
            String contentType = connection.getContentType();
            if (contentType != null && contentType.contains("video")) {
                mimeType = contentType.split(";")[0].trim();
            }

            inputStream = connection.getInputStream();
            long contentLength = connection.getContentLengthLong();
            Log.d(TAG, "Downloading video: " + videoUrl + " (" + contentLength + " bytes), mime: " + mimeType);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                streamToMediaStore(call, inputStream, fileName, mimeType);
            } else {
                streamToLegacy(call, inputStream, fileName, mimeType);
            }

        } catch (Exception e) {
            Log.e(TAG, "Download error", e);
            call.reject("Failed to download video: " + e.getMessage());
        } finally {
            try { if (inputStream != null) inputStream.close(); } catch (Exception ignored) {}
            if (connection != null) connection.disconnect();
        }
    }

    /**
     * Save raw bytes to gallery (used when base64 data is provided).
     */
    private void saveBytes(PluginCall call, byte[] data, String fileName, String mimeType) {
        Log.d(TAG, "Saving video from bytes: " + fileName + " (" + data.length + " bytes)");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+: Use MediaStore
            String displayName = ensureExtension(fileName, mimeType);
            long nowSeconds = System.currentTimeMillis() / 1000;
            long nowMs = System.currentTimeMillis();

            ContentValues values = new ContentValues();
            values.put(MediaColumns.DISPLAY_NAME, displayName);
            values.put(MediaColumns.MIME_TYPE, mimeType);
            putCameraVideoMetadata(values);
            values.put(MediaColumns.DATE_ADDED, nowSeconds);
            values.put(MediaColumns.DATE_MODIFIED, nowSeconds);
            values.put(MediaStore.Video.Media.DATE_TAKEN, nowMs);
            values.put(MediaColumns.IS_PENDING, 1);

            ContentResolver resolver = getContext().getContentResolver();
            Uri uri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);

            if (uri == null) {
                call.reject("Failed to create media entry");
                return;
            }

            try (OutputStream os = resolver.openOutputStream(uri)) {
                if (os == null) {
                    call.reject("Failed to open output stream");
                    return;
                }
                os.write(data);
                os.flush();

                values.clear();
                values.put(MediaColumns.IS_PENDING, 0);
                values.put(MediaColumns.SIZE, data.length);
                resolver.update(uri, values, null, null);
                resolver.notifyChange(uri, null);
                scanCameraFile(displayName, mimeType);

                JSObject result = new JSObject();
                result.put("uri", uri.toString());
                result.put("saved", true);
                call.resolve(result);
            } catch (Exception e) {
                resolver.delete(uri, null, null);
                call.reject("Failed to write: " + e.getMessage());
            }
        } else {
            // Legacy
            saveWithLegacy(call, data, fileName, mimeType);
        }
    }

    /**
     * Android 10+: Stream directly from InputStream to MediaStore.
     * This is the most reliable approach — no intermediate files or base64.
     */
    private void streamToMediaStore(PluginCall call, InputStream inputStream, String fileName, String mimeType) {
        String displayName = ensureExtension(fileName, mimeType);
        long nowSeconds = System.currentTimeMillis() / 1000;
        long nowMs = System.currentTimeMillis();

        ContentValues values = new ContentValues();
        values.put(MediaColumns.DISPLAY_NAME, displayName);
        values.put(MediaColumns.MIME_TYPE, mimeType);
        putCameraVideoMetadata(values);
        values.put(MediaColumns.DATE_ADDED, nowSeconds);
        values.put(MediaColumns.DATE_MODIFIED, nowSeconds);
        values.put(MediaStore.Video.Media.DATE_TAKEN, nowMs);
        values.put(MediaColumns.IS_PENDING, 1);

        ContentResolver resolver = getContext().getContentResolver();
        Uri uri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);

        if (uri == null) {
            call.reject("Failed to create media entry in gallery");
            return;
        }

        try (OutputStream os = resolver.openOutputStream(uri)) {
            if (os == null) {
                call.reject("Failed to open gallery output stream");
                return;
            }

            // Stream in 8KB chunks — memory efficient even for large videos
            byte[] buffer = new byte[8192];
            int bytesRead;
            long totalWritten = 0;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                os.write(buffer, 0, bytesRead);
                totalWritten += bytesRead;
            }
            os.flush();

            // Mark as complete — video now appears in gallery
            values.clear();
            values.put(MediaColumns.IS_PENDING, 0);
            values.put(MediaColumns.SIZE, totalWritten);
            resolver.update(uri, values, null, null);
            resolver.notifyChange(uri, null);
            scanCameraFile(displayName, mimeType);

            Log.d(TAG, "Video saved to gallery: " + uri + " (" + totalWritten + " bytes)");

            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            result.put("saved", true);
            result.put("size", totalWritten);
            call.resolve(result);

        } catch (Exception e) {
            resolver.delete(uri, null, null);
            Log.e(TAG, "Failed to stream video to gallery", e);
            call.reject("Failed to save video: " + e.getMessage());
        }
    }

    /**
     * Android 9 and below: Stream to DCIM/Camera file.
     */
    @SuppressWarnings("deprecation")
    private void streamToLegacy(PluginCall call, InputStream inputStream, String fileName, String mimeType) {
        File cameraDir = getCameraDir();

        if (!cameraDir.exists() && !cameraDir.mkdirs()) {
            call.reject("Failed to create DCIM/Camera directory");
            return;
        }

        String displayName = ensureExtension(fileName, mimeType);
        File videoFile = new File(cameraDir, displayName);

        try (FileOutputStream fos = new FileOutputStream(videoFile)) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                fos.write(buffer, 0, bytesRead);
            }
            fos.flush();

            // Trigger media scanner
            android.content.Intent mediaScanIntent = new android.content.Intent(
                    android.content.Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
            mediaScanIntent.setData(Uri.fromFile(videoFile));
            bridge.getActivity().sendBroadcast(mediaScanIntent);

            Log.d(TAG, "Video saved (legacy): " + videoFile.getAbsolutePath());
            JSObject result = new JSObject();
            result.put("uri", videoFile.getAbsolutePath());
            result.put("saved", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to write video (legacy)", e);
            call.reject("Failed to save video: " + e.getMessage());
        }
    }

    @SuppressWarnings("deprecation")
    private void saveWithLegacy(PluginCall call, byte[] data, String fileName, String mimeType) {
        File cameraDir = getCameraDir();

        if (!cameraDir.exists() && !cameraDir.mkdirs()) {
            call.reject("Failed to create DCIM/Camera directory");
            return;
        }

        String displayName = ensureExtension(fileName, mimeType);
        File videoFile = new File(cameraDir, displayName);

        try (FileOutputStream fos = new FileOutputStream(videoFile)) {
            fos.write(data);
            fos.flush();

            android.content.Intent mediaScanIntent = new android.content.Intent(
                    android.content.Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
            mediaScanIntent.setData(Uri.fromFile(videoFile));
            bridge.getActivity().sendBroadcast(mediaScanIntent);

            JSObject result = new JSObject();
            result.put("uri", videoFile.getAbsolutePath());
            result.put("saved", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to save video: " + e.getMessage());
        }
    }

    /**
     * Save an image to gallery (used for image downloads).
     */
    @PluginMethod
    public void saveImageToGallery(PluginCall call) {
        String base64Data = call.getString("data");
        String fileName = call.getString("fileName", "image_" + System.currentTimeMillis());
        String mimeType = call.getString("mimeType", "image/png");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("No image data provided");
            return;
        }

        new Thread(() -> {
            try {
                byte[] decoded = Base64.decode(base64Data, Base64.DEFAULT);
                String displayName = ensureExtension(fileName, mimeType);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    long nowSeconds = System.currentTimeMillis() / 1000;
                    long nowMs = System.currentTimeMillis();

                    ContentValues values = new ContentValues();
                    values.put(MediaColumns.DISPLAY_NAME, displayName);
                    values.put(MediaColumns.MIME_TYPE, mimeType);
                    values.put(MediaColumns.RELATIVE_PATH, CAMERA_PATH);
                    values.put(MediaColumns.DATE_ADDED, nowSeconds);
                    values.put(MediaColumns.DATE_MODIFIED, nowSeconds);
                    values.put(MediaStore.Images.Media.DATE_TAKEN, nowMs);
                    values.put(MediaColumns.IS_PENDING, 1);

                    ContentResolver resolver = getContext().getContentResolver();
                    Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);

                    if (uri == null) {
                        call.reject("Failed to create image entry");
                        return;
                    }

                    try (OutputStream os = resolver.openOutputStream(uri)) {
                        if (os == null) { call.reject("No output stream"); return; }
                        os.write(decoded);
                        os.flush();

                        values.clear();
                        values.put(MediaColumns.IS_PENDING, 0);
                        values.put(MediaColumns.SIZE, decoded.length);
                        resolver.update(uri, values, null, null);
                        resolver.notifyChange(uri, null);
                        scanCameraFile(displayName, mimeType);

                        JSObject result = new JSObject();
                        result.put("uri", uri.toString());
                        result.put("saved", true);
                        call.resolve(result);
                    } catch (Exception e) {
                        resolver.delete(uri, null, null);
                        call.reject("Failed to save image: " + e.getMessage());
                    }
                } else {
                    saveLegacyImage(call, decoded, displayName);
                }
            } catch (Exception e) {
                call.reject("Failed to save image: " + e.getMessage());
            }
        }).start();
    }

    @SuppressWarnings("deprecation")
    private void saveLegacyImage(PluginCall call, byte[] data, String fileName) throws Exception {
        File imageFile = new File(getCameraDir(), fileName);
        File parent = imageFile.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            call.reject("Failed to create DCIM/Camera directory");
            return;
        }

        try (FileOutputStream fos = new FileOutputStream(imageFile)) {
            fos.write(data);
            fos.flush();
        }

        android.content.Intent mediaScanIntent = new android.content.Intent(
                android.content.Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
        mediaScanIntent.setData(Uri.fromFile(imageFile));
        bridge.getActivity().sendBroadcast(mediaScanIntent);

        JSObject result = new JSObject();
        result.put("uri", imageFile.getAbsolutePath());
        result.put("saved", true);
        call.resolve(result);
    }

    private String ensureExtension(String fileName, String mimeType) {
        String safeName = fileName == null ? "xtramys_" + System.currentTimeMillis() : fileName.trim();
        if (safeName.isEmpty()) safeName = "xtramys_" + System.currentTimeMillis();
        String lower = safeName.toLowerCase(Locale.ROOT);
        if (lower.matches(".*\\.[a-z0-9]{2,5}$")) return safeName;
        if (mimeType.contains("jpeg") || mimeType.contains("jpg")) return safeName + ".jpg";
        if (mimeType.contains("png")) return safeName + ".png";
        if (mimeType.contains("webp")) return safeName + ".webp";
        if (mimeType.contains("webm")) return safeName + ".webm";
        return safeName + ".mp4";
    }
}
