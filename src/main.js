import React, { Component } from 'react'
import io from 'socket.io-client'
import VoipPushNotification from 'react-native-voip-push-notification';

import {
    Platform,
    StyleSheet,
    Text,
    View,
    Button
} from 'react-native'

import {
    RTCPeerConnection,
    RTCMediaStream,
    RTCIceCandidate,
    RTCSessionDescription,
    RTCView,
    MediaStreamTrack,
    getUserMedia,
} from 'react-native-webrtc'


let container;
const pcPeers = {};
let localStream;
const socket = io.connect('https://react-native-webrtc.herokuapp.com', { transports: ['websocket'] });
socket.on('exchange', data => exchange(data))
socket.on('leave', socketId => leave(socketId))
socket.on('connect', () => {
    getLocalStream(true, stream => {
        localStream = stream;
        container.setState({ selfViewSrc: stream.toURL() });
    });
})

const logError = err => console.log(err)

const getStats = () => {
    const pc = pcPeers[Object.keys(pcPeers)[0]];
    if (pc.getRemoteStreams()[0] && pc.getRemoteStreams()[0].getAudioTracks()[0]) {
        const track = pc.getRemoteStreams()[0].getAudioTracks()[0];
        console.log('track', track);
        pc.getStats(track, (report) => console.log('getStats report', report), logError);
    }
}

const leave = socketId => {
    console.log('leave', socketId);
    const pc = pcPeers[socketId];
    pc.close();
    delete pcPeers[socketId];

    container.setState({ remoteURL: null });
}

const exchange = data => {
    console.log(`on exchange data:`, data)

    const fromId = data.from;
    let pc;
    if (fromId in pcPeers) {
        pc = pcPeers[fromId];
    } else {
        pc = createPC(fromId, false);
    }

    if (data.sdp) {
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp), () => {
            console.log(`pc.remoteDescription.type: `, pc.remoteDescription.type)
            if (pc.remoteDescription.type == "offer")
                createAnswer(pc, fromId)
        }, logError);
    }

    if (data.candidate) {
        console.log('exchange candidate:', data.candidate);
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
}

const getLocalStream = (isFront, callback) => {

    let videoSourceId;

    // on android, you don't have to specify sourceId manually, just use facingMode
    // uncomment it if you want to specify
    if (Platform.OS === 'ios') {
        MediaStreamTrack.getSources(sourceInfos => {
            console.log("sourceInfos: ", sourceInfos);

            for (const i = 0; i < sourceInfos.length; i++) {
                const sourceInfo = sourceInfos[i];
                if (sourceInfo.kind == "video" && sourceInfo.facing == (isFront ? "front" : "back")) {
                    videoSourceId = sourceInfo.id;
                }
            }
        });
    }

    getUserMedia({
        audio: true,
        video: {
            mandatory: {
                minWidth: 640, // Provide your own width, height and frame rate here
                minHeight: 360,
                minFrameRate: 30,
            },
            facingMode: (isFront ? "user" : "environment"),
            optional: (videoSourceId ? [{ sourceId: videoSourceId }] : []),
        }
    }, stream => {
        console.log('getUserMedia success', stream);
        callback(stream);
    }, logError);

}

const createAnswer = (pc, fromId) => {
    pc.createAnswer(desc => {
        console.log('createAnswer', desc);
        pc.setLocalDescription(desc, () => {
            console.log('setLocalDescription', pc.localDescription);
            socket.emit('exchange', { 'to': fromId, 'sdp': pc.localDescription });
        }, logError)
    }, logError)
}

const createOffer = (pc, socketId) => {
    pc.createOffer(desc => {
        pc.setLocalDescription(desc, () => {
            socket.emit('exchange', { 'to': socketId, 'sdp': pc.localDescription });
        }, logError);
    }, logError)
}

const createPC = (socketId, isOffer) => {
    console.log(`createPC socketId:`, socketId)

    const pc = new RTCPeerConnection(configuration)
    pcPeers[socketId] = pc;

    pc.onicecandidate = (event) => {
        if (event.candidate)
            socket.emit('exchange', { 'to': socketId, 'candidate': event.candidate })
    }

    pc.onnegotiationneeded = () => {
        console.log(`on negotiation needed`)
        if (isOffer) {
            createOffer(pc, socketId);
        }
    }

    pc.oniceconnectionstatechange = (event) => {
        console.log('oniceconnectionstatechange', event.target.iceConnectionState)
        if (event.target.iceConnectionState === 'completed') {
            setTimeout(() => getStats(), 1000);
        }
    }

    pc.onsignalingstatechange = (event) => {
        console.log('onsignalingstatechange', event.target.signalingState);
    };

    pc.onaddstream = (event) => {
        container.setState({ remoteURL: event.stream.toURL() });
    }

    pc.onremovestream = (event) => {
        console.log('onremovestream', event.stream);
        container.setState({ remoteURL: null });
    }

    pc.addStream(localStream)

    return pc;
}


const configuration = {
    "iceServers": [
        { url: "stun:stun.l.google.com:19302" },
        { url: 'stun:stun1.l.google.com:19302' },
        { url: 'turn:numb.viagenie.ca', username: "nat.chung1@gmail.com", credential: "2roixdui" }
    ]
}

export default class main extends Component {

    state = {
        videoURL: null,
        remoteURL: null,
        selfViewSrc: null,
        peerViewSrc: null,
        status: 'init',
        roomID: ''
    }

    componentWillMount() { // or anywhere which is most comfortable and appropriate for you 
        VoipPushNotification.requestPermissions(); // required 

        VoipPushNotification.addEventListener('register', (token) => {
            // send token to your apn provider server 
            console.log(`got register from voip push, token: ` + token)
        });

        VoipPushNotification.addEventListener('notification', (notification) => {
            // register your VoIP client, show local notification, etc. 
            // e.g. 
            //this.doRegister();

            console.log(`got notification:`, notification)

            /* there is a boolean constant exported by this module called
             * 
             * wakeupByPush
             * 
             * you can use this constant to distinguish the app is launched
             * by VoIP push notification or not
             *
             * e.g.
             */
            if (VoipPushNotification.wakeupByPush) {
                // do something... 

                // remember to set this static variable to false 
                // since the constant are exported only at initialization time 
                // and it will keep the same in the whole app 
                VoipPushNotification.wakeupByPush = false;
            }

            /**
             * Local Notification Payload
             *
             * - `alertBody` : The message displayed in the notification alert.
             * - `alertAction` : The "action" displayed beneath an actionable notification. Defaults to "view";
             * - `soundName` : The sound played when the notification is fired (optional).
             * - `category`  : The category of this notification, required for actionable notifications (optional).
             * - `userInfo`  : An optional object containing additional notification data.
             */
            VoipPushNotification.presentLocalNotification({
                alertBody: "hello! " + notification.getMessage()
            });
        });
    }

    componentDidMount() {
        container = this
    }

    _onPress() {

        for (let sid in pcPeers) {
            leave(sid)
        }

        socket.emit('join', "0929522741", socketIds => {
            console.log(`socketIDs.length: ` + socketIds.length)
            for (const i in socketIds) {
                const socketId = socketIds[i];
                createPC(socketId, true);
            }
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