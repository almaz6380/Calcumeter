package com.almaz6380.calcumeter;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // eigenes Plugin: Daten für die Homescreen-Widgets
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
