import React, { Component } from 'react'
import VoipPushNotification from 'react-native-voip-push-notification'
import RNCallKit from 'react-native-callkit'
import uuid from 'uuid'
import WebRTCHandler from './WebRTCHandler'
import { RTCView } from 'react-native-webrtc'
import { Toolbar, COLOR, ThemeProvider } from 'react-native-material-ui'
import FCM, {FCMEvent, RemoteNotificationResult, WillPresentNotificationResult, NotificationType} from 'react-native-fcm';
import {
    Platform,
    StyleSheet,
    Text,
    View,
    Button,
    NativeModules,
    Dimensions,
    TouchableOpacity,
    Image,
    StatusBar
} from 'react-native'
import backgroundImg from './background.png'

const getImage = (state) => {
    switch (state) {
        case 'none': return require('./startcall.png')
        case 'calling': return require('./endcall.png')
        case 'waiting': return require('./loading.gif')
    }
}

const videoView = (remoteURL) => {
    return (remoteURL) ? <RTCView streamURL={remoteURL} style={styles.peerView} /> : <View style={styles.peerView} />
}

const LiveView = (props) => (
    <View style={styles.container}>
    <StatusBar backgroundColor="#396CD2" barStyle="light-content" />
        <Toolbar />
        <Image source={require('./background.png')} style={styles.backgroundImage} />
        {videoView(props.remoteURL)}
        <View style={styles.controller}>
            <TouchableOpacity onPress={props.onClick}>
                <Image style={styles.button} source={getImage(props.callStatus)} />
            </TouchableOpacity>
        </View>
    </View>
)

const InCommingView = (props) => (
    <View style={{
        flexDirection: 'column-reverse',
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height + 30
    }}>
        <Image source={require('./incomming_background.png')} style={{
            position: 'absolute',
            width: Dimensions.get('window').width,
            height: Dimensions.get('window').height + 30
        }} />


        <StatusBar backgroundColor="#000000" barStyle="light-content" />

        <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            width: Dimensions.get('window').width,
            height: 180
        }} >
            <TouchableOpacity onPress={props.onReject}>
                <Image style={styles.inCommingCallButton} source={require('./endcall.png')} />
            </TouchableOpacity>

            <TouchableOpacity onPress={props.onAnswer}>
                <Image style={styles.inCommingCallButton} source={require('./startcall.png')} />
            </TouchableOpacity>

        </View>

    </View>
)

export default class main extends Component {

    state = {
        videoURL: null,
        remoteURL: null,
        webrtcHandler: new WebRTCHandler(this._setupSelfUrl.bind(this)),
        callStatus: 'none',//calling, none, waiting,
        uuid: null,
        viewType: 'incomming', //live, incoming
    }

    _setupSelfUrl(streamUrl) {
        console.log(`Setup Done`)
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
            uuid: null,
        }
        try {
            RNCallKit.setup(options);
        } catch (err) {
            console.log('error:', err.message);
        }

        // Add RNCallKit Events
        RNCallKit.addEventListener('didReceiveStartCallAction', this.onRNCallKitDidReceiveStartCallAction.bind(this));
        RNCallKit.addEventListener('answerCall', this.onRNCallKitPerformAnswerCallAction.bind(this));
        RNCallKit.addEventListener('endCall', this.onRNCallKitPerformEndCallAction.bind(this));
        RNCallKit.addEventListener('didActivateAudioSession', this.onRNCallKitDidActivateAudioSession.bind(this));
    }

    onVoipNotifcationRegister(token) {
        console.log(`got register from voip push, token: ` + token)
    }

    onVoipNotifcation(notification) {
        console.log(`onVoipNotifcation`)
        this.onIncomingCall()
    }

    onRNCallKitDidReceiveStartCallAction(data) {
        console.log(`onRNCallKitDidReceiveStartCallAction`)
    }

    onRNCallKitPerformAnswerCallAction(data) {
        console.log(`onRNCallKitPerformAnswerCallAction`)
    }

    onRNCallKitPerformEndCallAction(data) {
        console.log(`onRNCallKitPerformEndCallAction`)
    }

    onRNCallKitDidActivateAudioSession(data) {
        console.log(`onRNCallKitDidActivateAudioSession`)
        this._onPress();
    }

    onIncomingCall() {
        this.setState({ uuid: uuid.v4() })
        console.log(`incomming, `, this.state.uuid)
        RNCallKit.displayIncomingCall(this.state.uuid, "LucasHuang", "number", true)
    }

    componentWillUnmount() {
        // stop listening for events
        this.notificationListener.remove();
    }

    componentDidMount() {
        container = this
        container._onPress()

        if(Platform.OS === 'ios') return

        FCM.requestPermissions().then(()=>console.log('granted')).catch(()=>console.log('notification permission rejected'));
        
        FCM.getFCMToken().then(token => {
            console.log(token)
            // store fcm token in your server
        });
        
        this.notificationListener = FCM.on(FCMEvent.Notification, async (notif) => {
            // optional, do some component related stuff
        });
        
        // initial notification contains the notification that launchs the app. If user launchs app by clicking banner, the banner notification info will be here rather than through FCM.on event
        // sometimes Android kills activity when app goes to background, and when resume it broadcasts notification before JS is run. You can use FCM.getInitialNotification() to capture those missed events.
        // initial notification will be triggered all the time even when open app by icon so send some action identifier when you send notification
        FCM.getInitialNotification().then(notif => {
           console.log(notif)
        });
    }

    _onPress() {

        switch (this.state.callStatus) {
            case 'none':
                this.setState({ callStatus: 'waiting' })
                this.state.webrtcHandler.connect('0929522741', (error, streamUrl) => {
                    container.setState({ remoteURL: streamUrl });
                    this.setState({ callStatus: 'calling' })
                })

                break;

            case 'calling':
                this.setState({ callStatus: 'waiting' })
                this.state.webrtcHandler.disconnect(() => {
                    this.setState({ callStatus: 'none', remoteURL: null })
                })
                RNCallKit.endCall(this.state.uuid)

                break;

            default:
                break;
        }
    }

    _onReject(){
        this.setState({viewType:'live'})
    }

    _onAnswer(){
        console.log(`onAnswer`)
        this.setState({viewType:'live'})
        // this._onPress.bind(this)
        // this._onPress()
    }

    render() {
        return (
            <ThemeProvider uiTheme={uiTheme}>
            {(this.state.viewType === 'live') ? 
            <LiveView 
                remoteURL={this.state.remoteURL} 
                onClick={this._onPress.bind(this)} 
                callStatus={this.state.callStatus} /> 
                : 
                <InCommingView 
                onAnswer={this._onAnswer.bind(this)} 
                onReject={this._onReject.bind(this)} />}
            </ThemeProvider>
        )
    }
}

const uiTheme = {
    palette: {
        primaryColor: '#396CD2',
    },
    toolbar: {
        container: {
            height: (Platform.OS === 'ios') ? 64 : 50,
        },
    },
};



const styles = StyleSheet.create({

    backgroundImage: {
        flex: 1,
        resizeMode: 'cover', // or 'stretch'
    },

    container: {
        flexDirection: 'column'
    },

    controller: {
        flexDirection: 'column',
        justifyContent: 'center',
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height - ((Dimensions.get('window').width) * 11 / 14 + uiTheme.toolbar.container.height)
    },

    peerView: {
        width: Dimensions.get('window').width,
        height: (Dimensions.get('window').width) * 11 / 14,
        backgroundColor: 'gray'
    },

    button: {
        width: 120,
        height: 120,
        alignSelf: 'center'
    },

    inCommingCallButton: {
        width: 90,
        height: 90,
        alignSelf: 'center'
    }

});
