package com.almaz6380.calcumeter;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Nimmt aus der Web-App Kurse, Basiswährung und Favoriten für das Wechselkurs-Widget entgegen. */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {
    @PluginMethod
    public void setData(PluginCall call) {
        String json = call.getString("json", "{}");
        WidgetStore.save(getContext(), json);
        WidgetStore.refreshAll(getContext());
        call.resolve();
    }
}
