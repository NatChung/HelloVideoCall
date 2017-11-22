import React, { Component } from 'react'
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
import io from 'socket.io-client'

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

const exchange = data => {
    console.log(`on exchange data:`, data)

    const fromId = data.from;
    let pc;
    if (fromId in pcPeers) {
        console.log(`get fromId from pcPeers`)
        pc = pcPeers[fromId];
    } else {
        console.log(`Create a new one without offer`)
        pc = createPC(fromId, false);
    }

    if (data.sdp) {
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {
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
    pc.createAnswer( desc => {
        console.log('createAnswer', desc);
        pc.setLocalDescription(desc,  () => {
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

    const pc = new RTCPeerConnection(configuration);
    pcPeers[socketId] = pc;

    pc.onicecandidate = (event) => {
        console.log('onicecandidate :', event.candidate);
        if (event.candidate)
            socket.emit('exchange', { 'to': socketId, 'candidate': event.candidate })
    }

    pc.onnegotiationneeded = () => {
        console.log('onnegotiationneeded');
        if (isOffer) {
          createOffer(pc, socketId);
        }
    }

    pc.oniceconnectionstatechange = (event) => {
        console.log(`oniceconnectionstatechange: `, event)
    }

    pc.onsignalingstatechange = (event) => {
        console.log('onsignalingstatechange', event.target.signalingState);
    };

    pc.onaddstream = (event) => {
        console.log('onaddstream', event.stream);
        container.setState({ remoteURL: event.stream.toURL() });
    }

    pc.onremovestream = (event) => {
        console.log('onremovestream', event.stream);
    }

    pc.addStream(localStream)

    return pc;
}


const configuration = {
    "iceServers": [
        { url: "stun:stun.l.google.com:19302" },
        { url: 'stun:stun1.l.google.com:19302' },
        { url: 'turn:numb.viagenie.ca', username: "nat@starvedia.com", credential: "starvedia" }
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

    componentDidMount() {
        container = this
    }

    _onPress() {
        console.log(`onPress`)
        socket.emit('join', "natchung.starvedia.testroom", socketIds => {
            console.log(`onPress, socketIds.lenght:`, socketIds.length)
            for (const i in socketIds) {
                const socketId = socketIds[i];
                createPC(socketId, true);
            }
        })
    }

    render() {
        return (
            <RTCView streamURL={this.state.remoteURL} style={styles.peerView} >
                <View style={styles.bottom}>
                    <Button
                        title="Learn More"
                        color="#841584"
                        accessibilityLabel="Learn more about this purple button"
                        style={styles.button}
                        onPress={this._onPress.bind(this)}
                    />
                    <RTCView streamURL={this.state.selfViewSrc} style={styles.selfView} />
                </View>
            </RTCView>
        )
    }
}

const styles = StyleSheet.create({

    bottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        height: 150
    },
    button: {
        alignSelf: 'flex-end',
        backgroundColor: 'black'
    },
    peerView: {
        flex: 1,
        flexDirection: 'column-reverse',
        backgroundColor: 'green'

    },
    selfView: {
        height: 140,
        width: 110,
        marginBottom: 10
    }
});