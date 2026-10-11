package com.almaz6380.calcumeter;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

/** Schnellstart-Widget: vier Knöpfe, die direkt einen Bereich der App öffnen. */
public class QuickWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        render(ctx, mgr, ids);
    }

    static void render(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_quick);
            v.setOnClickPendingIntent(R.id.quick_calc, RateWidget.open(ctx, "calc", 20));
            v.setOnClickPendingIntent(R.id.quick_fx, RateWidget.open(ctx, "fx", 21));
            v.setOnClickPendingIntent(R.id.quick_units, RateWidget.open(ctx, "units", 22));
            v.setOnClickPendingIntent(R.id.quick_graph, RateWidget.open(ctx, "graph", 23));
            mgr.updateAppWidget(id, v);
        }
    }
}
