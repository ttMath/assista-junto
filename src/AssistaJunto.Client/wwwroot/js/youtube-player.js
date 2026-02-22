window.youtubePlayer = {
    player: null,
    dotNetRef: null,
    isReady: false,
    pendingVideoId: null,
    _lastKnownTime: 0,
    _timeTracker: null,
    _lastState: -1,

    initialize: function (elementId, dotNetReference) {
        this.dotNetRef = dotNetReference;
        this.isReady = false;
        this.pendingVideoId = null;
        this._lastKnownTime = 0;
        this._lastState = -1;

        if (typeof YT !== 'undefined' && typeof YT.Player !== 'undefined') {
            this._createPlayer(elementId);
        } else {
            window.onYouTubeIframeAPIReady = () => {
                this._createPlayer(elementId);
            };
        }
    },

    _createPlayer: function (elementId) {
        var self = this;
        this.player = new YT.Player(elementId, {
            height: '100%',
            width: '100%',
            playerVars: {
                'autoplay': 0,
                'controls': 1,
                'rel': 0,
                'modestbranding': 1,
                'origin': window.location.origin
            },
            events: {
                'onReady': function () {
                    self.isReady = true;
                    if (self.pendingVideoId) {
                        self.player.loadVideoById(self.pendingVideoId);
                        self.pendingVideoId = null;
                    }
                    if (self.dotNetRef) {
                        self.dotNetRef.invokeMethodAsync('OnPlayerReady');
                    }
                },
                'onStateChange': function (event) {
                    var currentTime = self.player ? self.player.getCurrentTime() : 0;

                    if (event.data === 3 && self._lastState === 1) {
                        var diff = Math.abs(currentTime - self._lastKnownTime);
                        if (diff > 2 && self._lastKnownTime > 0) {
                            if (self.dotNetRef) {
                                self.dotNetRef.invokeMethodAsync('OnPlayerSeeked', currentTime);
                            }
                        }
                    }

                    if (event.data === 1) {
                        self._lastKnownTime = currentTime;
                        self._startTimeTracking();
                    } else {
                        self._stopTimeTracking();
                        if (event.data === 2) {
                            self._lastKnownTime = currentTime;
                        }
                    }

                    self._lastState = event.data;

                    if (self.dotNetRef) {
                        self.dotNetRef.invokeMethodAsync('OnPlayerStateChanged', event.data);
                    }
                },
                'onError': function (event) {
                    console.error('YouTube Player Error:', event.data);
                }
            }
        });
    },

    _startTimeTracking: function () {
        this._stopTimeTracking();
        var self = this;
        this._timeTracker = setInterval(function () {
            if (self.player && self.isReady) {
                self._lastKnownTime = self.player.getCurrentTime();
            }
        }, 1000);
    },

    _stopTimeTracking: function () {
        if (this._timeTracker) {
            clearInterval(this._timeTracker);
            this._timeTracker = null;
        }
    },

    loadVideo: function (videoId, startSeconds) {
        if (!videoId) return;
        if (this.player && this.isReady) {
            this._lastKnownTime = startSeconds || 0;
            if (startSeconds && startSeconds > 0) {
                this.player.loadVideoById({ videoId: videoId, startSeconds: startSeconds });
            } else {
                this.player.loadVideoById(videoId);
            }
        } else {
            this.pendingVideoId = videoId;
        }
    },

    cueVideo: function (videoId, startSeconds) {
        if (!videoId) return;
        if (this.player && this.isReady) {
            this._lastKnownTime = startSeconds || 0;
            if (startSeconds && startSeconds > 0) {
                this.player.cueVideoById({ videoId: videoId, startSeconds: startSeconds });
            } else {
                this.player.cueVideoById(videoId);
            }
        } else {
            this.pendingVideoId = videoId;
        }
    },

    play: function () {
        if (this.player && this.isReady) {
            this.player.playVideo();
        }
    },

    pause: function () {
        if (this.player && this.isReady) {
            this.player.pauseVideo();
        }
    },

    seekTo: function (seconds) {
        if (this.player && this.isReady) {
            this._lastKnownTime = seconds;
            this.player.seekTo(seconds, true);
        }
    },

    getCurrentTime: function () {
        if (this.player && this.isReady) {
            return this.player.getCurrentTime();
        }
        return 0;
    },

    setVolume: function (volume) {
        if (this.player && this.isReady) {
            this.player.setVolume(volume);
        }
    },

    mute: function () {
        if (this.player && this.isReady) {
            this.player.mute();
        }
    },

    unmute: function () {
        if (this.player && this.isReady) {
            this.player.unMute();
        }
    },

    resolvePlaylist: function (playlistId) {
        return new Promise(function (resolve) {
            var tempDiv = document.createElement('div');
            tempDiv.id = 'yt-temp-' + Date.now();
            tempDiv.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
            document.body.appendChild(tempDiv);

            var resolved = false;
            var tempPlayer;
            var interval;

            var cleanup = function () {
                if (resolved) return;
                resolved = true;
                if (interval) clearInterval(interval);
                try { tempPlayer.destroy(); } catch (e) { }
                if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);
            };

            tempPlayer = new YT.Player(tempDiv.id, {
                height: '1',
                width: '1',
                playerVars: {
                    'list': playlistId,
                    'listType': 'playlist',
                    'autoplay': 0
                },
                events: {
                    'onReady': function (event) {
                        interval = setInterval(function () {
                            var ids = event.target.getPlaylist();
                            if (ids && ids.length > 0) {
                                cleanup();
                                resolve(ids);
                            }
                        }, 300);

                        setTimeout(function () {
                            cleanup();
                            resolve([]);
                        }, 10000);
                    },
                    'onError': function () {
                        cleanup();
                        resolve([]);
                    }
                }
            });

            setTimeout(function () {
                cleanup();
                resolve([]);
            }, 15000);
        });
    },

    destroy: function () {
        this._stopTimeTracking();
        if (this.player) {
            this.player.destroy();
            this.player = null;
            this.isReady = false;
            this.pendingVideoId = null;
        }
    }
};
