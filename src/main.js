import React, { Component } from 'react'
import VoipPushNotification from 'react-native-voip-push-notification'
import RNCallKit from 'react-native-callkit'
import uuid from 'uuid'
import WebRTCHandler from './WebRTCHandler'
import { RTCView } from 'react-native-webrtc'
import { Toolbar, COLOR, ThemeProvider } from 'react-native-material-ui'
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

export default class main extends Component {

    state = {
        videoURL: null,
        remoteURL: null,
        selfViewSrc: null,
        peerViewSrc: null,
        webrtcHandler: new WebRTCHandler(this._setupSelfUrl.bind(this)),
        callStatus: 'none'//calling, none, waiting
    }

    _setupSelfUrl(streamUrl) {
        console.log(`Setup Done`)
        this.setState({ selfViewSrc: streamUrl })
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

        if (Platform.OS === 'ios')
            return

        this.setState({ selfViewSrc: this.state.webrtcHandler.localStream })
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
                this.setState({ callStatus: 'none' })
                this.state.webrtcHandler.disconnect()

                break;

            default:
                break;
        }


    }

    render() {
        return (
            <ThemeProvider uiTheme={uiTheme}>
                <StatusBar backgroundColor="#396CD2" barStyle="light-content" />

                <View style={styles.container}>
                    <Toolbar />
                    <Image source={require('./background.png')} style={styles.backgroundImage} />
                    <RTCView streamURL={this.state.remoteURL} style={styles.peerView} />

                    <View style={styles.controller}>
                        <TouchableOpacity onPress={this._onPress.bind(this)}>
                            <Image style={styles.button}
                                source={getImage(this.state.callStatus)}
                            />
                        </TouchableOpacity>
                    </View>

                </View>
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
        width: 100,
        height: 100,
        alignSelf: 'center'
    }

});
