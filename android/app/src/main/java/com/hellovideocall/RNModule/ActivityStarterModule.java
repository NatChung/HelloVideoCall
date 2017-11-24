package com.hellovideocall.RNModule;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.view.WindowManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.hellovideocall.MainActivity;

/**
 * Created by jeffrey on 2017/11/23.
 */

public class ActivityStarterModule extends ReactContextBaseJavaModule {

    public ActivityStarterModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "ActivityStarter";
    }

    @SuppressLint("WrongConstant")
    @ReactMethod
    void navigateToMain() {

        ReactApplicationContext context = getReactApplicationContext();
        Intent alarmIntent = new Intent("android.intent.action.MAIN");
        alarmIntent.setClass(context, MainActivity.class);
        alarmIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        alarmIntent.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED +
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD +
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON +
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        context.startActivity(alarmIntent);

    }

}
