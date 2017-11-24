import io from 'socket.io-client'
import {
    RTCPeerConnection,
    RTCMediaStream,
    RTCIceCandidate,
    RTCSessionDescription,
    RTCView,
    MediaStreamTrack,
    getUserMedia,
} from 'react-native-webrtc'

const configuration = {
    "iceServers": [
        { url: "stun:stun.l.google.com:19302" },
        { url: 'stun:stun1.l.google.com:19302' },
        { url: 'turn:numb.viagenie.ca', username: "nat.chung1@gmail.com", credential: "2roixdui" }
    ]
}

export default class WebRTCHandler {

    constructor(callback) {

        console.log(`WebRTCHandler constructor`)

        this.localStream = null
        this._pcPeers = {}
    
        this._socket = io.connect('https://b563889e.ngrok.io', { transports: ['websocket'] });
        this._socket.on('exchange', this._socketOnExchange.bind(this))
        this._socket.on('leave', this._socketOnLeave.bind(this))
        this._socket.on('connect', this._socketOnConnect.bind(this))
        this._callback = {
            onDisconnected:null,
            onConnected:null,
            onInitedLocalStreamURL: callback
        }
    }

    _onError(error){
        this._callback.onConnected(error)
    }

    _socketOnExchange(data) {

        let fromId = data.from;
        let pc;
        if (fromId in this._pcPeers) {
            pc = this._pcPeers[fromId];
        } else {
            pc = this._createPC(fromId, false);
        }

        if (data.sdp) {
            pc.setRemoteDescription(new RTCSessionDescription(data.sdp), () => {
                console.log(`pc.remoteDescription.type: `, pc.remoteDescription.type)
                if (pc.remoteDescription.type == "offer")
                    this._createAnswer(pc, fromId)
            }, this._onError);
        }

        if (data.candidate) {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }

    }

    _socketOnLeave(socketId) {

        console.log('leave', socketId);
        const pc = this._pcPeers[socketId];
        if(pc){
            pc.close();
            delete this._pcPeers[socketId];
        }
    }

    _socketOnConnect() {
        getUserMedia({
            audio: true,
            video: false
        }, this._setupLocalStream.bind(this), error => console.log(error))
    }

    _setupLocalStream(stream){
        console.log('getUserMedia success', stream)
        console.log(this._callback)
        this.localStream = stream
        this._callback.onInitedLocalStreamURL(stream.toURL())
    }

    _peerOnIceCandidate( socketId, event){
        if (event.candidate){
            this._socket.emit('exchange', { 'to': socketId, 'candidate': event.candidate })
        }
    }

    _peerOnnegotiatioNneeded(pc, socketId, isOffer){
        console.log(`on negotiation needed, `, pc, socketId, isOffer)
        if (isOffer) {
            this._createOffer(pc, socketId)
        }
    }

    _peerOnIceConnectionStateChange(event){
        console.log('oniceconnectionstatechange', event.target.iceConnectionState)
    }

    _peerOnSignalingStatechange(event){
        console.log('onsignalingstatechange', event.target.signalingState);
    }

    _peerOnAddStream(event) {
        console.log(`_peerOnAddStream`, event.stream)
        console.log(`video tracks`, event.stream.getVideoTracks())

        if(event.stream.getVideoTracks().length>0){
            this._callback.onConnected(null, event.stream.toURL())
        }
    }

    _peerOnRemoveStream(event){
        console.log('onremovestream', event.stream);
        this._callback.onDisconnected(event.stream.toURL())
    }


    _createPC(socketId, isOffer){
        console.log(`createPC socketId:`, socketId, isOffer)
    
        const pc = new RTCPeerConnection(configuration)
        this._pcPeers[socketId] = pc;
        pc.onicecandidate = this._peerOnIceCandidate.bind(this, socketId)
        pc.onnegotiationneeded = this._peerOnnegotiatioNneeded.bind(this, pc, socketId, isOffer)
        pc.oniceconnectionstatechange = this._peerOnIceConnectionStateChange.bind(this)
        pc.onsignalingstatechange = this._peerOnSignalingStatechange.bind(this)
        pc.onaddstream = this._peerOnAddStream.bind(this)
        pc.onremovestream = this._peerOnRemoveStream.bind(this)
        pc.addStream(this.localStream)
        return pc;
    }

    _createAnswer(pc, fromId){
        pc.createAnswer(desc => {
            pc.setLocalDescription(desc, () => {
                this._socket.emit('exchange', { 'to': fromId, 'sdp': pc.localDescription });
            }, this._onError)
        }, this._onError)
    }
    
    _createOffer(pc, socketId){
        console.log(`create Offer`)
        pc.createOffer(desc => {
            pc.setLocalDescription(desc, () => {
                this._socket.emit('exchange', { 'to': socketId, 'sdp': pc.localDescription });
            }, this._onError);
        }, this._onError)
    }
    
    connect(roomId, onConnected){
        this._callback.onConnected = onConnected
        
        this._socket.emit('join', roomId, socketIds => {
            console.log(`socketIDs.length: ` + socketIds.length)
            for (const i in socketIds) {
                const socketId = socketIds[i];
                this._createPC(socketId, true);
            }
        })
    }

    disconnect(){
        for( socketId in this._pcPeers){
            this._socketOnLeave(socketId)
        }
    }
}