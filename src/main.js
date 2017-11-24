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

const videoView = (remoteURL) => {
    return (remoteURL) ? <RTCView streamURL={remoteURL} style={styles.peerView} /> : <View style={styles.peerView}/>
}

export default class main extends Component {

    state = {
        videoURL: null,
        remoteURL: null,
        webrtcHandler: new WebRTCHandler(this._setupSelfUrl.bind(this)),
        callStatus: 'none',//calling, none, waiting,
        uuid: null
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
            uuid:null,
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
        this.setState({uuid:uuid.v4()})
        console.log(`incomming, `, this.state.uuid)
        RNCallKit.displayIncomingCall(this.state.uuid, "LucasHuang", "number", true)
    }

    componentWillUnmount() {
        // stop listening for events
        this.notificationListener.remove();
    }

    componentDidMount() {
        container = this
    }

    _onPress() {

        switch (this.state.callStatus) {
            case 'none':
                this.setState({ callStatus: 'waiting'})
                this.state.webrtcHandler.connect('0929522741', (error, streamUrl) => {
                    container.setState({ remoteURL: streamUrl });
                    this.setState({ callStatus: 'calling' })
                })

                break;

            case 'calling':
                this.setState({ callStatus: 'waiting'})
                this.state.webrtcHandler.disconnect( () => {
                    this.setState({ callStatus: 'none', remoteURL: null})
                })
                RNCallKit.endCall(this.state.uuid)

                break;

            default:
                break;
        }


    }

    render() {
        return (
            <ThemeProvider uiTheme={uiTheme}>
                <View style={styles.container}>
                <StatusBar backgroundColor="#396CD2" barStyle="light-content" />
                    <Toolbar />
                    <Image source={require('./background.png')} style={styles.backgroundImage} />
                    {videoView(this.state.remoteURL)}
                    <View style={styles.controller}>
                        <TouchableOpacity onPress={this._onPress.bind(this)}>
                            <Image style={styles.button} source={getImage(this.state.callStatus)} />
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
        width: 120,
        height: 120,
        alignSelf: 'center'
    }

});
