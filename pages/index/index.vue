<template>
  <view class="container">
    <button class="top-button" :class="{ 'disabled': currentPlayer !== 2 || confirmed }" @tap="confirmMove">
      <text class="rotated-text">{{ currentPlayer === 2 && !confirmed ? '确认落子' : '未到你回合' }}</text>
    </button>
    <canvas canvas-id="gobang" 
            id="gobang" 
            @tap="handleTap"
            :style="{ width: boardSize + 'px', height: boardSize + 'px' }">
    </canvas>
    <button class="bottom-button" :class="{ 'disabled': currentPlayer !== 1 || confirmed }" @tap="confirmMove">
      {{ currentPlayer === 1 && !confirmed ? '确认落子' : '未到你回合' }}
    </button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      boardSize: uni.getSystemInfoSync().windowWidth, // 棋盘大小
      gridNum: 17,    
      pieceSize: 0,   // 棋子大小
      board: [],      // 棋盘数据
      currentPlayer: 1, // 1代表黑棋，2代表白棋
      context: null,   // canvas上下文
      confirmed: false,    // 是否确认当前落子
      lastMove: null,     // 最后一步的位置
      scale: 1,          // 动画缩放比例
      animationTimer: null // 动画定时器
    }
  },
  
   onLoad() {
      // 创建音频上下文对象
      this.audioContext = uni.createInnerAudioContext();
      // 设置音频文件的路径，这里假设音频文件存放在 static 目录下
      this.audioContext.src = '/static/audio/music.mp3';
      // 监听音频播放结束事件
      this.audioContext.onEnded(() => {
        console.log('音频播放结束');
      });
      // 监听音频播放错误事件
      this.audioContext.onError((err) => {
        console.error('音频播放出错', err);
      });
    },
  
  onReady() {
    this.initGame()
  },
  
  methods: {
    initGame() {
      // 初始化棋盘数据
      this.board = Array(this.gridNum).fill().map(() => Array(this.gridNum).fill(0))
      this.pieceSize = this.boardSize / (this.gridNum + 1)
      
      // 获取canvas上下文
      this.context = uni.createCanvasContext('gobang', this)
      this.drawBoard()
    },
    
    drawBoard() {
      const ctx = this.context
      // 更改棋盘背景色为白色
      ctx.setFillStyle('#bca761')
      ctx.fillRect(0, 0, this.boardSize, this.boardSize)
      
      // 绘制棋盘网格，使用更细的线条
      ctx.setStrokeStyle('#1f1f1f')
      ctx.setLineWidth(0.8)
      for (let i = 0; i < this.gridNum; i++) {
        // 横线
        ctx.moveTo(this.pieceSize, this.pieceSize * (i + 1))
        ctx.lineTo(this.boardSize - this.pieceSize, this.pieceSize * (i + 1))
        // 竖线
        ctx.moveTo(this.pieceSize * (i + 1), this.pieceSize)
        ctx.lineTo(this.pieceSize * (i + 1), this.boardSize - this.pieceSize)
      }
      ctx.stroke()
      
      // 绘制棋子
      for (let i = 0; i < this.gridNum; i++) {
        for (let j = 0; j < this.gridNum; j++) {
          if (this.board[i][j] !== 0) {
            this.drawPiece(i, j, this.board[i][j])
          }
        }
      }
      
      ctx.draw()
    },
    
    drawPiece(row, col, player) {
      const ctx = this.context
      const x = (col + 1) * this.pieceSize
      const y = (row + 1) * this.pieceSize
      
      let radius = this.pieceSize * 0.4
      if (!this.confirmed && this.lastMove && row === this.lastMove.row && col === this.lastMove.col) {
        radius *= this.scale
        ctx.setGlobalAlpha(0.7)
      }
      
      // 添加阴影效果
      ctx.setShadow(2, 2, 4, 'rgba(0, 0, 0, 0.15)')
      
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      if (player === 1) {
        // 黑棋使用渐变
        const gradient = ctx.createCircularGradient(x, y, radius)
        gradient.addColorStop(0, '#4A4A4A')
        gradient.addColorStop(1, '#000000')
        ctx.setFillStyle(gradient)
      } else {
        // 白棋使用渐变
        const gradient = ctx.createCircularGradient(x, y, radius)
        gradient.addColorStop(0, '#FFFFFF')
        gradient.addColorStop(1, '#E0E0E0')
        ctx.setFillStyle(gradient)
      }
      ctx.fill()
      
      if (player === 2) {
        ctx.setStrokeStyle('rgba(0, 0, 0, 0.1)')
        ctx.stroke()
      }
      
      // 重置阴影和透明度
      ctx.setShadow(0, 0, 0, 'rgba(0, 0, 0, 0)')
      ctx.setGlobalAlpha(1)
    },
    
    handleTap(e) {
      if (this.confirmed) return // 如果已确认，不能再落子
      
      const rect = e.target
      const x = e.detail.x - rect.offsetLeft
      const y = e.detail.y - rect.offsetTop
      
      // 计算落子位置
      const col = Math.round(x / this.pieceSize - 1)
      const row = Math.round(y / this.pieceSize - 1)
      
      // 检查是否可以落子
      if (col >= 0 && col < this.gridNum && row >= 0 && row < this.gridNum && this.board[row][col] === 0) {
        // 清除之前的落子
        if (this.lastMove) {
          this.board[this.lastMove.row][this.lastMove.col] = 0
        }
        
        this.board[row][col] = this.currentPlayer
        this.lastMove = { row, col }
        this.startAnimation()
        this.drawBoard()
		
		this.audioContext.play();
      }
    },
    
    confirmMove() {
      if (!this.lastMove || this.confirmed) return
      
      this.confirmed = true
      this.stopAnimation()
      this.drawBoard()
      
      // 检查是否获胜
      if (this.checkWin(this.lastMove.row, this.lastMove.col)) {
        setTimeout(() => {
          uni.showModal({
            title: '游戏结束',
            content: `${this.currentPlayer === 1 ? '黑棋' : '白棋'}获胜！`,
            showCancel: false,
            success: () => {
              this.resetGame()
            }
          })
        }, 100)
        return
      }
      
      // 切换玩家
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1
      this.confirmed = false
      this.lastMove = null
    },
    
    checkWin(row, col) {
      const directions = [
        [1, 0],   // 横向
        [0, 1],   // 纵向
        [1, 1],   // 右斜
        [1, -1]   // 左斜
      ]
      
      for (const [dx, dy] of directions) {
        let count = 1
        
        // 正向检查
        for (let i = 1; i < 5; i++) {
          const newRow = row + dx * i
          const newCol = col + dy * i
          if (newRow < 0 || newRow >= this.gridNum || 
              newCol < 0 || newCol >= this.gridNum ||
              this.board[newRow][newCol] !== this.currentPlayer) {
            break
          }
          count++
        }
        
        // 反向检查
        for (let i = 1; i < 5; i++) {
          const newRow = row - dx * i
          const newCol = col - dy * i
          if (newRow < 0 || newRow >= this.gridNum || 
              newCol < 0 || newCol >= this.gridNum ||
              this.board[newRow][newCol] !== this.currentPlayer) {
            break
          }
          count++
        }
        
        if (count >= 5) return true
      }
      return false
    },
    
    startAnimation() {
      this.stopAnimation()
      let growing = true
      this.scale = 1
      
      this.animationTimer = setInterval(() => {
        if (growing) {
          this.scale += 0.05
          if (this.scale >= 1.2) growing = false
        } else {
          this.scale -= 0.05
          if (this.scale <= 0.8) growing = true
        }
        this.drawBoard()
      }, 50)
    },
    
    stopAnimation() {
      if (this.animationTimer) {
        clearInterval(this.animationTimer)
        this.animationTimer = null
      }
      this.scale = 1
    },
    
    resetGame() {
      this.currentPlayer = 1
      this.confirmed = false
      this.lastMove = null
      this.stopAnimation()
      this.initGame()
    }
  }
}
</script>

<style>
.container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  height: 100vh;
  background-color: #F5F5F7;
  padding: 30px 20px;
  box-sizing: border-box; 
  background-color: #ffefe0;
}

.top-button, .bottom-button {
  width: 240px;
  height: 50px;
  margin: 15px 0;
  background-color: #007AFF;
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 18px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.2);
  transition: all 0.3s ease;
}

.top-button:active, .bottom-button:active {
  transform: scale(0.98);
  background-color: #0066D6;
}

.disabled {
  background-color: #E5E5EA;
  color: #8E8E93;
  pointer-events: none;
  box-shadow: none;
}

.rotated-text {
  display: inline-block;
  transform: rotate(180deg);
}

canvas {
  background-color: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  margin: 20px 0;
}

.status {
  margin: 20px 0;
  font-size: 18px;
  color: #1D1D1F;
}
</style>