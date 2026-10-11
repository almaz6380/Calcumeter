package com.almaz6380.calcumeter;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.DateFormat;
import java.text.NumberFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;

/** Gemeinsamer Speicher der Widgets: Daten aus der App plus selbst geladene Kurse (Basis EUR). */
final class WidgetStore {
    private static final String PREFS = "calcumeter_widget";
    private static final String KEY = "data";
    private static final String RATES_URL = "https://open.er-api.com/v6/latest/EUR";

    private WidgetStore() {}

    static void save(Context ctx, String json) {
        prefs(ctx).edit().putString(KEY, json).apply();
    }

    static JSONObject load(Context ctx) {
        try {
            return new JSONObject(prefs(ctx).getString(KEY, "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Kurse neu laden (im Hintergrund aufrufen); liefert true, wenn neue Kurse gespeichert wurden. */
    static boolean fetchRates(Context ctx) {
        HttpURLConnection con = null;
        try {
            con = (HttpURLConnection) new URL(RATES_URL).openConnection();
            con.setConnectTimeout(8000);
            con.setReadTimeout(8000);
            if (con.getResponseCode() != 200) return false;
            StringBuilder sb = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(con.getInputStream(), "UTF-8"))) {
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
            }
            JSONObject res = new JSONObject(sb.toString());
            if (!"success".equals(res.optString("result"))) return false;
            JSONObject data = load(ctx);
            data.put("rates", res.getJSONObject("rates"));
            data.put("updated", res.optLong("time_last_update_unix") * 1000L);
            save(ctx, data.toString());
            return true;
        } catch (Exception e) {
            return false;
        } finally {
            if (con != null) con.disconnect();
        }
    }

    /** Kurs 1 from → to aus den gespeicherten Kursen (Basis EUR), NaN wenn unbekannt. */
    static double rate(JSONObject data, String from, String to) {
        JSONObject rates = data.optJSONObject("rates");
        if (rates == null || !rates.has(from) || !rates.has(to)) return Double.NaN;
        return rates.optDouble(to) / rates.optDouble(from);
    }

    /** Sprache der App für Zahlen und Datum (z. B. "fr-FR"); ältere Daten kennen nur "de"/"en". */
    static Locale locale(JSONObject data) {
        String tag = data.optString("locale", "");
        if (!tag.isEmpty()) return Locale.forLanguageTag(tag);
        String lang = data.optString("lang", "");
        if (lang.startsWith("de")) return Locale.GERMANY;
        if (lang.startsWith("en")) return Locale.UK;
        return Locale.getDefault();
    }

    static String format(double v, Locale locale) {
        if (Double.isNaN(v)) return "–";
        NumberFormat nf = NumberFormat.getNumberInstance(locale);
        int digits = v >= 100 ? 2 : v >= 1 ? 4 : 6;
        nf.setMinimumFractionDigits(Math.min(2, digits));
        nf.setMaximumFractionDigits(digits);
        return nf.format(v);
    }

    static String date(JSONObject data, Locale locale) {
        long ms = data.optLong("updated", 0);
        if (ms <= 0) return "";
        return DateFormat.getDateInstance(DateFormat.SHORT, locale).format(new Date(ms));
    }

    /** Alle Widgets neu zeichnen, z. B. nachdem die App neue Daten geliefert hat. */
    static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] rate = mgr.getAppWidgetIds(new ComponentName(ctx, RateWidget.class));
        if (rate.length > 0) RateWidget.render(ctx, mgr, rate);
        int[] quick = mgr.getAppWidgetIds(new ComponentName(ctx, QuickWidget.class));
        if (quick.length > 0) QuickWidget.render(ctx, mgr, quick);
    }

}
