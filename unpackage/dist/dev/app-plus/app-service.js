if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global = uni.requireGlobal();
  ArrayBuffer = global.ArrayBuffer;
  Int8Array = global.Int8Array;
  Uint8Array = global.Uint8Array;
  Uint8ClampedArray = global.Uint8ClampedArray;
  Int16Array = global.Int16Array;
  Uint16Array = global.Uint16Array;
  Int32Array = global.Int32Array;
  Uint32Array = global.Uint32Array;
  Float32Array = global.Float32Array;
  Float64Array = global.Float64Array;
  BigInt64Array = global.BigInt64Array;
  BigUint64Array = global.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$1 = {
    data() {
      return {
        boardSize: uni.getSystemInfoSync().windowWidth,
        // 棋盘大小
        gridNum: 17,
        pieceSize: 0,
        // 棋子大小
        board: [],
        // 棋盘数据
        currentPlayer: 1,
        // 1代表黑棋，2代表白棋
        context: null,
        // canvas上下文
        confirmed: false,
        // 是否确认当前落子
        lastMove: null,
        // 最后一步的位置
        scale: 1,
        // 动画缩放比例
        animationTimer: null
        // 动画定时器
      };
    },
    onLoad() {
      this.audioContext = uni.createInnerAudioContext();
      this.audioContext.src = "/static/audio/music.mp3";
      this.audioContext.onEnded(() => {
        formatAppLog("log", "at pages/index/index.vue:41", "音频播放结束");
      });
      this.audioContext.onError((err) => {
        formatAppLog("error", "at pages/index/index.vue:45", "音频播放出错", err);
      });
    },
    onReady() {
      this.initGame();
    },
    methods: {
      initGame() {
        this.board = Array(this.gridNum).fill().map(() => Array(this.gridNum).fill(0));
        this.pieceSize = this.boardSize / (this.gridNum + 1);
        this.context = uni.createCanvasContext("gobang", this);
        this.drawBoard();
      },
      drawBoard() {
        const ctx = this.context;
        ctx.setFillStyle("#bca761");
        ctx.fillRect(0, 0, this.boardSize, this.boardSize);
        ctx.setStrokeStyle("#1f1f1f");
        ctx.setLineWidth(0.8);
        for (let i = 0; i < this.gridNum; i++) {
          ctx.moveTo(this.pieceSize, this.pieceSize * (i + 1));
          ctx.lineTo(this.boardSize - this.pieceSize, this.pieceSize * (i + 1));
          ctx.moveTo(this.pieceSize * (i + 1), this.pieceSize);
          ctx.lineTo(this.pieceSize * (i + 1), this.boardSize - this.pieceSize);
        }
        ctx.stroke();
        for (let i = 0; i < this.gridNum; i++) {
          for (let j = 0; j < this.gridNum; j++) {
            if (this.board[i][j] !== 0) {
              this.drawPiece(i, j, this.board[i][j]);
            }
          }
        }
        ctx.draw();
      },
      drawPiece(row, col, player) {
        const ctx = this.context;
        const x = (col + 1) * this.pieceSize;
        const y = (row + 1) * this.pieceSize;
        let radius = this.pieceSize * 0.4;
        if (!this.confirmed && this.lastMove && row === this.lastMove.row && col === this.lastMove.col) {
          radius *= this.scale;
          ctx.setGlobalAlpha(0.7);
        }
        ctx.setShadow(2, 2, 4, "rgba(0, 0, 0, 0.15)");
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        if (player === 1) {
          const gradient = ctx.createCircularGradient(x, y, radius);
          gradient.addColorStop(0, "#4A4A4A");
          gradient.addColorStop(1, "#000000");
          ctx.setFillStyle(gradient);
        } else {
          const gradient = ctx.createCircularGradient(x, y, radius);
          gradient.addColorStop(0, "#FFFFFF");
          gradient.addColorStop(1, "#E0E0E0");
          ctx.setFillStyle(gradient);
        }
        ctx.fill();
        if (player === 2) {
          ctx.setStrokeStyle("rgba(0, 0, 0, 0.1)");
          ctx.stroke();
        }
        ctx.setShadow(0, 0, 0, "rgba(0, 0, 0, 0)");
        ctx.setGlobalAlpha(1);
      },
      handleTap(e) {
        if (this.confirmed)
          return;
        const rect = e.target;
        const x = e.detail.x - rect.offsetLeft;
        const y = e.detail.y - rect.offsetTop;
        const col = Math.round(x / this.pieceSize - 1);
        const row = Math.round(y / this.pieceSize - 1);
        if (col >= 0 && col < this.gridNum && row >= 0 && row < this.gridNum && this.board[row][col] === 0) {
          if (this.lastMove) {
            this.board[this.lastMove.row][this.lastMove.col] = 0;
          }
          this.board[row][col] = this.currentPlayer;
          this.lastMove = { row, col };
          this.startAnimation();
          this.drawBoard();
          this.audioContext.play();
        }
      },
      confirmMove() {
        if (!this.lastMove || this.confirmed)
          return;
        this.confirmed = true;
        this.stopAnimation();
        this.drawBoard();
        if (this.checkWin(this.lastMove.row, this.lastMove.col)) {
          setTimeout(() => {
            uni.showModal({
              title: "游戏结束",
              content: `${this.currentPlayer === 1 ? "黑棋" : "白棋"}获胜！`,
              showCancel: false,
              success: () => {
                this.resetGame();
              }
            });
          }, 100);
          return;
        }
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.confirmed = false;
        this.lastMove = null;
      },
      checkWin(row, col) {
        const directions = [
          [1, 0],
          // 横向
          [0, 1],
          // 纵向
          [1, 1],
          // 右斜
          [1, -1]
          // 左斜
        ];
        for (const [dx, dy] of directions) {
          let count = 1;
          for (let i = 1; i < 5; i++) {
            const newRow = row + dx * i;
            const newCol = col + dy * i;
            if (newRow < 0 || newRow >= this.gridNum || newCol < 0 || newCol >= this.gridNum || this.board[newRow][newCol] !== this.currentPlayer) {
              break;
            }
            count++;
          }
          for (let i = 1; i < 5; i++) {
            const newRow = row - dx * i;
            const newCol = col - dy * i;
            if (newRow < 0 || newRow >= this.gridNum || newCol < 0 || newCol >= this.gridNum || this.board[newRow][newCol] !== this.currentPlayer) {
              break;
            }
            count++;
          }
          if (count >= 5)
            return true;
        }
        return false;
      },
      startAnimation() {
        this.stopAnimation();
        let growing = true;
        this.scale = 1;
        this.animationTimer = setInterval(() => {
          if (growing) {
            this.scale += 0.05;
            if (this.scale >= 1.2)
              growing = false;
          } else {
            this.scale -= 0.05;
            if (this.scale <= 0.8)
              growing = true;
          }
          this.drawBoard();
        }, 50);
      },
      stopAnimation() {
        if (this.animationTimer) {
          clearInterval(this.animationTimer);
          this.animationTimer = null;
        }
        this.scale = 1;
      },
      resetGame() {
        this.currentPlayer = 1;
        this.confirmed = false;
        this.lastMove = null;
        this.stopAnimation();
        this.initGame();
      }
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode(
        "button",
        {
          class: vue.normalizeClass(["top-button", { "disabled": $data.currentPlayer !== 2 || $data.confirmed }]),
          onClick: _cache[0] || (_cache[0] = (...args) => $options.confirmMove && $options.confirmMove(...args))
        },
        [
          vue.createElementVNode(
            "text",
            { class: "rotated-text" },
            vue.toDisplayString($data.currentPlayer === 2 && !$data.confirmed ? "确认落子" : "未到你回合"),
            1
            /* TEXT */
          )
        ],
        2
        /* CLASS */
      ),
      vue.createElementVNode(
        "canvas",
        {
          "canvas-id": "gobang",
          id: "gobang",
          onClick: _cache[1] || (_cache[1] = (...args) => $options.handleTap && $options.handleTap(...args)),
          style: vue.normalizeStyle({ width: $data.boardSize + "px", height: $data.boardSize + "px" })
        },
        null,
        4
        /* STYLE */
      ),
      vue.createElementVNode(
        "button",
        {
          class: vue.normalizeClass(["bottom-button", { "disabled": $data.currentPlayer !== 1 || $data.confirmed }]),
          onClick: _cache[2] || (_cache[2] = (...args) => $options.confirmMove && $options.confirmMove(...args))
        },
        vue.toDisplayString($data.currentPlayer === 1 && !$data.confirmed ? "确认落子" : "未到你回合"),
        3
        /* TEXT, CLASS */
      )
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__file", "D:/weixin_pj/离线五子棋/pages/index/index.vue"]]);
  __definePage("pages/index/index", PagesIndexIndex);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:7", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:10", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "D:/weixin_pj/离线五子棋/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
