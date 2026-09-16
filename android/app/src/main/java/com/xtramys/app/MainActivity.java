package com.xtramys.app;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VideoSaverPlugin.class);
        registerPlugin(NativeVideoEncoderPlugin.class);
        super.onCreate(savedInstanceState);
        getBridge().getWebView().setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
    }
}
