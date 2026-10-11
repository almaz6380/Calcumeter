package com.almaz6380.calcumeter;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import java.util.Locale;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Wechselkurs-Widget. Klein: ein Kurs groß. Ab etwa 2 Zeilen Höhe: Basiswährung und bis zu 4 Favoriten.
 * Lädt die Kurse beim regelmäßigen Update (alle 2 Stunden, siehe rate_widget_info.xml) selbst nach.
 */
public class RateWidget extends AppWidgetProvider {
    private static final int[][] ROWS = {
        { R.id.row1, R.id.code1, R.id.val1 },
        { R.id.row2, R.id.code2, R.id.val2 },
        { R.id.row3, R.id.code3, R.id.val3 },
        { R.id.row4, R.id.code4, R.id.val4 },
    };

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        render(ctx, mgr, ids);
        final PendingResult pending = goAsync();
        final Context app = ctx.getApplicationContext();
        new Thread(() -> {
            try {
                if (WidgetStore.fetchRates(app)) render(app, mgr, ids);
            } finally {
                pending.finish();
            }
        }).start();
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle options) {
        render(ctx, mgr, new int[] { id });
    }

    static void render(Context ctx, AppWidgetManager mgr, int[] ids) {
        JSONObject data = WidgetStore.load(ctx);
        Locale loc = WidgetStore.locale(data);
        String from = data.optString("from", "EUR");
        JSONArray favs = data.optJSONArray("favorites");
        if (favs == null) favs = new JSONArray().put("USD").put("GBP").put("CHF").put("JPY");
        String date = WidgetStore.date(data, loc);

        for (int id : ids) {
            Bundle opt = mgr.getAppWidgetOptions(id);
            boolean small = opt.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0) < 100;
            RemoteViews v;
            String first = favs.length() > 0 ? favs.optString(0) : "USD";
            if (first.equals(from) && favs.length() > 1) first = favs.optString(1);
            if (small) {
                v = new RemoteViews(ctx.getPackageName(), R.layout.widget_rate_small);
                v.setTextViewText(R.id.small_title, "1 " + from + " =");
                v.setTextViewText(R.id.small_value, WidgetStore.format(WidgetStore.rate(data, from, first), loc));
                v.setTextViewText(R.id.small_code, first);
                v.setTextViewText(R.id.small_date, date);
            } else {
                v = new RemoteViews(ctx.getPackageName(), R.layout.widget_rate);
                v.setTextViewText(R.id.rate_title, "1 " + from);
                v.setTextViewText(R.id.rate_date, date);
                int row = 0;
                for (int i = 0; i < favs.length() && row < ROWS.length; i++) {
                    String code = favs.optString(i);
                    if (code.equals(from)) continue;
                    v.setViewVisibility(ROWS[row][0], View.VISIBLE);
                    v.setTextViewText(ROWS[row][1], code);
                    v.setTextViewText(ROWS[row][2], WidgetStore.format(WidgetStore.rate(data, from, code), loc));
                    row++;
                }
                for (; row < ROWS.length; row++) v.setViewVisibility(ROWS[row][0], View.GONE);
            }
            v.setOnClickPendingIntent(R.id.widget_root, open(ctx, "fx", 10));
            mgr.updateAppWidget(id, v);
        }
    }

    static PendingIntent open(Context ctx, String view, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("calcumeter://view/" + view), ctx, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
