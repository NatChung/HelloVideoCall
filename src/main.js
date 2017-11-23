import React, { Component } from 'react'
import VoipPushNotification from 'react-native-voip-push-notification'
import RNCallKit from 'react-native-callkit'
import uuid from 'uuid'
import FCM, {FCMEvent} from 'react-native-fcm';
import WebRTCHandler from './WebRTCHandler'
import { RTCView} from 'react-native-webrtc'
import {
    Platform,
    StyleSheet,
    Text,
    View,
    Button,
    NativeModules
} from 'react-native'

export default class main extends Component {

    state = {
        videoURL: null,
        remoteURL: null,
        selfViewSrc: null,
        peerViewSrc: null,
        webrtcHandler: new WebRTCHandler(this._setupSelfUrl.bind(this)),
    }

    _setupSelfUrl(streamUrl){
        console.log(`Setup Done`)
        this.setState({selfViewSrc: streamUrl})
    }

    constructor(props) {
        super(props)
        
        if (Platform.OS === 'ios') {
            this._initVoipNotification()
            this._initRNCallkit()
        }
    }

    _initVoipNotification() {
        VoipPushNotification.requestPermissions(); // required 
        VoipPushNotification.addEventListener('register', this.onVoipNotifcationRegister.bind(this))
        VoipPushNotification.addEventListener('notification', this.onVoipNotifcation.bind(this));
    }

    _initRNCallkit() {
        let options = {
            appName: 'HelloVideoCall',
            imageName: 'video_call.png',
            ringtoneSound: 'Ringtone.caf',
        }
        try {
            RNCallKit.setup(options);
        } catch (err) {
            console.log('error:', err.message);
        }

        // Add RNCallKit Events
        RNCallKit.addEventListener('didReceiveStartCallAction', this.onRNCallKitDidReceiveStartCallAction);
        RNCallKit.addEventListener('answerCall', this.onRNCallKitPerformAnswerCallAction);
        RNCallKit.addEventListener('endCall', this.onRNCallKitPerformEndCallAction);
        RNCallKit.addEventListener('didActivateAudioSession', this.onRNCallKitDidActivateAudioSession.bind(this));
    }

    onVoipNotifcationRegister(token) {
        console.log(`got register from voip push, token: ` + token)
    }

    onVoipNotifcation(notification) {
        console.log(`got notification:`, notification)
        this.onIncomingCall()
        if (VoipPushNotification.wakeupByPush) {
            VoipPushNotification.wakeupByPush = false;
        }
    }

    onRNCallKitDidReceiveStartCallAction(data) {
        /*
         * Your normal start call action
         *
         * ... 
         *
         */

        let _uuid = uuid.v4();
        RNCallKit.startCall(_uuid, data.handle);

        console.log(`onRNCallKitDidReceiveStartCallAction`)
    }

    onRNCallKitPerformAnswerCallAction(data) {
        /* You will get this event when the user answer the incoming call
         *
         * Try to do your normal Answering actions here
         *
         * e.g. this.handleAnswerCall(data.callUUID);
         */
        console.log(`onRNCallKitPerformAnswerCallAction`)
    }

    onRNCallKitPerformEndCallAction(data) {
        /* You will get this event when the user finish the incoming/outgoing call
         *
         * Try to do your normal Hang Up actions here
         *
         * e.g. this.handleHangUpCall(data.callUUID);
         */
        console.log(`onRNCallKitPerformEndCallAction`)
    }

    onRNCallKitDidActivateAudioSession(data) {
        /* You will get this event when the the AudioSession has been activated by **RNCallKit**,
         * you might want to do following things when receiving this event:
         *
         * - Start playing ringback if it is an outgoing call
         */

        console.log(`onRNCallKitDidActivateAudioSession`)
        this._onPress();
    }

    // This is a fake function where you can receive incoming call notifications
    onIncomingCall() {
        // Store the generated uuid somewhere
        // You will need this when calling RNCallKit.endCall()
        let _uuid = uuid.v4();
        RNCallKit.displayIncomingCall(_uuid, "886900000000", "number", true)
    }

    // This is a fake function where you make outgoing calls
    onOutgoingCall() {
        // Store the generated uuid somewhere
        // You will need this when calling RNCallKit.endCall()
        let _uuid = uuid.v4();
        RNCallKit.startCall(_uuid, "886900000000")
    }

    // This is a fake function where you hang up calls
    onHangUpCall() {
        // get the _uuid you stored earlier
        RNCallKit.endCall(_uuid)
    }

    componentWillUnmount() {
        // stop listening for events
        this.notificationListener.remove();
    }

    componentDidMount() {
        container = this

        if(Platform.OS ==='ios')
            return

        this.setState({selfViewSrc: this.state.webrtcHandler.localStream})
        FCM.requestPermissions().then(()=>console.log('granted')).catch(()=>console.log('notification permission rejected'));
        FCM.getFCMToken().then(token => {
            console.log(token)
        })

        this.notificationListener = FCM.on(FCMEvent.Notification, async (notif) => {
            // optional, do some component related stuff
            console.log(`get notification 5`)
            
            NativeModules.ActivityStarter.navigateToMain()
            // this.notificationListener.remove();
        });
    } 

    _onPress() {
        this.state.webrtcHandler.connect('0929522741',(error, streamUrl) => {
            container.setState({ remoteURL: streamUrl });
        })
    }

    render() {
        return (

            <View style={{ flex: 1, }}>
                <RTCView streamURL={this.state.remoteURL} style={styles.peerView} />

                <Button
                    title="Learn More"
                    color="#841584"
                    accessibilityLabel="Learn more about this purple button"
                    style={styles.button}
                    onPress={this._onPress.bind(this)}
                />

                <RTCView streamURL={this.state.selfViewSrc} style={styles.selfView} />
            </View>
        )
    }
}

const styles = StyleSheet.create({

    button: {
    },
    peerView: {
        flex: 1,
        backgroundColor: 'green'
    },
    selfView: {
        height: 140,
        width: 110,
        position: 'absolute'
    }
});
