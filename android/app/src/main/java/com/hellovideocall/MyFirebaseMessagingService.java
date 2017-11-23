package com.hellovideocall;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.view.WindowManager;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * Created by jeffrey on 2017/11/23.
 */

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    @SuppressLint("WrongConstant")
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Intent alarmIntent = new Intent("android.intent.action.MAIN");
        alarmIntent.setClass(this, MainActivity.class);
        alarmIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        alarmIntent.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED +
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD +
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON +
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        startActivity(alarmIntent);
    }

}
