class Fighter {
    constructor(x, y, color, controls, facingRight = true, name, playerNumber) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 100;
        this.color = color;
        this.speed = window.innerWidth * 0.006;
        this.jumping = false;
        this.health = 100;
        this.controls = controls;
        this.attacking = false;
        this.energy = 0;
        this.maxEnergy = 100;
        this.isSuper = false;
        this.facingRight = facingRight;
        this.punchState = 0;
        this.kickState = 0;
        this.walkState = 0;
        this.animationSpeed = 0.15;
        this.name = name;
        this.isDead = false;
        this.punchProgress = 0;
        this.lastPunchTime = 0;
        this.punchCooldown = 300;
        this.sprites = {
            walk: document.getElementById(`player${playerNumber}Walk`),
            attack: document.getElementById(`player${playerNumber}Attack`),
            jump: document.getElementById(`player${playerNumber}Jump`)
        };
        
        this.loadSprites().then(() => {
            this.frameWidth = this.sprites.walk.width / 7;
            this.frameHeight = this.sprites.walk.height;
        });

        this.currentFrame = 0;
        this.animationState = 'walk';
        this.animationFrames = {
            walk: { 
                frames: playerNumber === "1" ? 8 : 7,
                speed: 0.15 
            },
            attack: { 
                frames: playerNumber === "1" ? 9 : 7,
                speed: 0.25 
            },
            jump: { 
                frames: playerNumber === "1" ? 8 : 7,
                speed: 0.2 
            }
        };

        this.attackBox = {
            width: 60,
            height: 50,
            offsetX: 30,
            offsetY: 20
        };
        this.attackCooldown = 500;
        this.lastAttackTime = 0;
        this.attackDamage = 10;
        this.attackFrame = 0;
        this.isAttackActive = false;
        this.playerNumber = playerNumber;
        
        this.scale = {
            x: playerNumber === "2" ? 0.8 : 1,
            y: 1
        };

        this.actionScales = {
            walk: { x: playerNumber === "2" ? 0.6 : 1, y: 1 },
            attack: { x: playerNumber === "2" ? 0.8 : 1, y: 1 },
            jump: { x: playerNumber === "2" ? 0.8 : 1, y: 1 }
        };

        this.groundY = window.innerHeight - 150;
        this.y = this.groundY;

        this.bullets = [];
        this.bulletSpeed = window.innerWidth * 0.015;
        this.bulletSize = 12;
        this.bulletDamage = this.attackDamage;
        this.bulletCooldown = 200;
        this.lastBulletTime = 0;
    }

    async loadSprites() {
        const promises = Object.values(this.sprites).map(sprite => {
            return new Promise((resolve) => {
                if (sprite.complete) {
                    resolve();
                } else {
                    sprite.onload = () => {
                        if (this.playerNumber === "1") {
                            if (sprite === this.sprites.walk) {
                                this.frameWidth = sprite.width / 8;
                            } else if (sprite === this.sprites.attack) {
                                this.frameWidth = sprite.width / 9;
                            } else if (sprite === this.sprites.jump) {
                                this.frameWidth = sprite.width / 8;
                            }
                        } else {
                            this.frameWidth = sprite.width / 7;
                        }
                        this.frameHeight = sprite.height;
                        resolve();
                    };
                }
            });
        });
        await Promise.all(promises);
    }

    drawLimb(ctx, x, y, width, height, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillRect(-width/2, -height/2, width, height);
        ctx.restore();
    }

    draw(ctx) {
        if (!this.frameWidth) return;
        
        this.updateAnimation();
        
        ctx.save();
        
        const currentScale = this.actionScales[this.animationState];
        
        if (!this.facingRight) {
            ctx.translate(this.x + this.width, this.y);
            ctx.scale(-1 * currentScale.x, currentScale.y);
            ctx.drawImage(
                this.sprites[this.animationState],
                Math.floor(this.currentFrame) * this.frameWidth,
                0,
                this.frameWidth,
                this.frameHeight,
                0,
                0,
                this.width / currentScale.x,
                this.height
            );
        } else {
            ctx.translate(this.x, this.y);
            ctx.scale(currentScale.x, currentScale.y);
            ctx.drawImage(
                this.sprites[this.animationState],
                Math.floor(this.currentFrame) * this.frameWidth,
                0,
                this.frameWidth,
                this.frameHeight,
                0,
                0,
                this.width / currentScale.x,
                this.height
            );
        }

        ctx.restore();
        
        this.drawBars(ctx);

        if (this.isAttackActive) {
            const attackBox = this.getAttackBox();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.strokeRect(attackBox.x, attackBox.y, attackBox.width, attackBox.height);
        }

        this.drawEffects(ctx);

        this.drawBullets(ctx);
    }

    drawCharacter(ctx) {
        ctx.save();
        
        const bodyX = this.x + this.width/2;
        const bodyY = this.y + this.height/2;

        const legAngle = this.walking ? Math.sin(this.walkState) * 0.3 : 0;
        ctx.fillStyle = this.color;
        this.drawLimb(ctx, bodyX - 10, bodyY + 30, 15, 40, legAngle);
        this.drawLimb(ctx, bodyX + 10, bodyY + 30, 15, 40, -legAngle);

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 10, this.y + 20, 30, 40);

        ctx.beginPath();
        ctx.arc(bodyX, this.y + 10, 15, 0, Math.PI * 2);
        ctx.fill();

        let leftArmAngle = 0;
        let rightArmAngle = 0;

        if (this.attacking) {
            const punchPhase = Math.sin(this.punchProgress * Math.PI);
            if (this.facingRight) {
                rightArmAngle = -1.5 * punchPhase;
            } else {
                leftArmAngle = 1.5 * punchPhase;
            }
        } else if (this.walking) {
            leftArmAngle = Math.sin(this.walkState) * 0.3;
            rightArmAngle = -Math.sin(this.walkState) * 0.3;
        }

        this.drawLimb(ctx, bodyX - 15, bodyY, 10, 30, leftArmAngle);
        this.drawLimb(ctx, bodyX + 15, bodyY, 10, 30, rightArmAngle);

        ctx.restore();
    }

    drawBars(ctx) {
        const barWidth = this.width;
        
        ctx.fillStyle = "#500";
        ctx.fillRect(this.x - 5, this.y - 25, barWidth + 10, 15);
        
        ctx.fillStyle = `rgb(${255 * (1 - this.health/100)}, ${255 * (this.health/100)}, 0)`;
        ctx.fillRect(this.x, this.y - 20, barWidth * (this.health/100), 10);
        
        ctx.fillStyle = "#440";
        ctx.fillRect(this.x - 5, this.y - 40, barWidth + 10, 10);
        
        ctx.fillStyle = "yellow";
        ctx.fillRect(this.x, this.y - 35, barWidth * (this.energy/this.maxEnergy), 5);
        
        ctx.fillStyle = "white";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(this.name, this.x + barWidth/2, this.y - 45);
    }

    move(keys) {
        if (this.isDead) return;

        const prevX = this.x;
        
        if (keys[this.controls.left]) {
            this.x -= this.speed;
            this.facingRight = false;
            this.walking = true;
        } else if (keys[this.controls.right]) {
            this.x += this.speed;
            this.facingRight = true;
            this.walking = true;
        } else {
            this.walking = false;
        }

        if (keys[this.controls.up] && !this.jumping) {
            this.jumping = true;
            this.currentFrame = 0;
            this.jumpVelocity = -this.height * 0.3;
        }

        if (this.jumping) {
            this.y += this.jumpVelocity;
            this.jumpVelocity += window.innerHeight * 0.001;

            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.jumping = false;
                this.currentFrame = 0;
            }
        }

        const currentTime = Date.now();
        if (keys[this.controls.attack] && currentTime - this.lastPunchTime > this.punchCooldown) {
            this.attacking = true;
            this.punchProgress = 0;
            this.lastPunchTime = currentTime;
            
            const animateAttack = () => {
                this.punchProgress += 0.15;
                if (this.punchProgress >= 1) {
                    this.attacking = false;
                    this.punchProgress = 0;
                } else {
                    requestAnimationFrame(animateAttack);
                }
            };
            animateAttack();
        }

        if (keys[this.controls.super] && this.energy >= this.maxEnergy) {
            this.isSuper = true;
            this.energy = 0;
            for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                    this.createHitEffect(
                        this.x + Math.random() * this.width,
                        this.y + Math.random() * this.height
                    );
                }, i * 100);
            }
            setTimeout(() => this.isSuper = false, 3000);
        }

        const margin = this.width * 0.5;
        this.x = Math.max(-margin, Math.min(this.x, window.innerWidth - this.width + margin));

        if (!this.attacking && !this.isSuper) {
            this.energy = Math.min(this.maxEnergy, this.energy + 0.1);
        }

        if (keys[this.controls.attack]) {
            this.attack();
        }
    }

    createHitEffect(x, y) {
        const effect = document.createElement('div');
        effect.className = 'effect';
        effect.style.left = x + 'px';
        effect.style.top = y + 'px';
        effect.style.width = '50px';
        effect.style.height = '50px';
        effect.style.backgroundColor = this.isSuper ? '#fff' : this.color;
        effect.style.borderRadius = '50%';
        document.body.appendChild(effect);
        
        setTimeout(() => effect.remove(), 500);
    }

    updateAnimation() {
        if (this.attacking) {
            this.animationState = 'attack';
            const maxAttackFrames = this.playerNumber === "1" ? 9 : 7;
            this.currentFrame = (this.currentFrame + this.animationFrames.attack.speed) % maxAttackFrames;
        } else if (this.jumping) {
            this.animationState = 'jump';
            const maxJumpFrames = this.playerNumber === "1" ? 8 : 7;
            this.currentFrame = (this.currentFrame + this.animationFrames.jump.speed) % maxJumpFrames;
        } else if (this.walking) {
            this.animationState = 'walk';
            const maxWalkFrames = this.playerNumber === "1" ? 8 : 7;
            this.currentFrame = (this.currentFrame + this.animationFrames.walk.speed) % maxWalkFrames;
        } else {
            this.animationState = 'walk';
            this.currentFrame = 0;
        }
    }

    attack() {
        const currentTime = Date.now();
        if (currentTime - this.lastAttackTime >= this.attackCooldown && !this.attacking) {
            this.attacking = true;
            this.isAttackActive = false;
            this.lastAttackTime = currentTime;
            this.currentFrame = 0;

            this.shootBullet();
            setTimeout(() => this.shootBullet(), 50);
            setTimeout(() => this.shootBullet(), 100);

            const attackAnimation = () => {
                this.currentFrame += this.animationFrames.attack.speed;
                const maxFrames = this.playerNumber === "1" ? 9 : 7;
                
                if (Math.floor(this.currentFrame) === 3) {
                    this.isAttackActive = true;
                    this.createAttackEffect();
                }
                
                if (Math.floor(this.currentFrame) === 5) {
                    this.isAttackActive = false;
                }
                
                if (this.currentFrame >= maxFrames) {
                    this.attacking = false;
                    this.isAttackActive = false;
                    this.currentFrame = 0;
                } else {
                    setTimeout(attackAnimation, 50);
                }
            };
            
            attackAnimation();
        }
    }

    createAttackEffect() {
        const effectX = this.facingRight ? 
            this.x + this.width + 10 : 
            this.x - 40;
            
        this.attackEffect = {
            x: effectX,
            y: this.y + 30,
            width: 40,
            height: 40,
            opacity: 0.7,
            color: this.isSuper ? '#ff0' : '#fff',
            startTime: Date.now()
        };
    }

    getAttackBox() {
        const attackScale = this.actionScales.attack;
        const attackWidth = this.attackBox.width * attackScale.x;
        const attackOffsetX = this.attackBox.offsetX * attackScale.x;

        return {
            x: this.facingRight ? 
                this.x + this.width + attackOffsetX : 
                this.x - attackWidth - attackOffsetX,
            y: this.y + this.attackBox.offsetY,
            width: attackWidth,
            height: this.attackBox.height
        };
    }

    onHit() {
        this.hitEffect = {
            x: this.x + this.width/2,
            y: this.y,
            text: '-' + this.attackDamage,
            startTime: Date.now(),
            moveUp: 0
        };
    }

    drawEffects(ctx) {
        if (this.attackEffect) {
            const elapsed = Date.now() - this.attackEffect.startTime;
            if (elapsed < 200) {
                ctx.save();
                ctx.globalAlpha = 0.7 * (1 - elapsed/200);
                ctx.fillStyle = this.attackEffect.color;
                ctx.beginPath();
                ctx.arc(
                    this.attackEffect.x + this.attackEffect.width/2,
                    this.attackEffect.y + this.attackEffect.height/2,
                    this.attackEffect.width/2,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            } else {
                this.attackEffect = null;
            }
        }

        if (this.hitEffect) {
            const elapsed = Date.now() - this.hitEffect.startTime;
            if (elapsed < 500) {
                this.hitEffect.moveUp = elapsed / 10;
                ctx.save();
                ctx.fillStyle = 'white';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.globalAlpha = 1 - elapsed/500;
                ctx.fillText(
                    this.hitEffect.text,
                    this.hitEffect.x,
                    this.hitEffect.y - this.hitEffect.moveUp
                );
                ctx.restore();
            } else {
                this.hitEffect = null;
            }
        }
    }

    shootBullet() {
        const currentTime = Date.now();
        if (currentTime - this.lastBulletTime < this.bulletCooldown) return;
        
        this.lastBulletTime = currentTime;
        
        const bulletX = this.facingRight ? 
            this.x + this.width + 10 : 
            this.x - 10;
        const bulletY = this.y + this.height * 0.45;
        
        this.bullets.push({
            x: bulletX,
            y: bulletY,
            speed: this.bulletSpeed * (this.facingRight ? 1 : -1),
            size: this.bulletSize,
            color: this.isSuper ? '#FFD700' : this.color,
            damage: this.isSuper ? this.bulletDamage * 2 : this.bulletDamage,
            alpha: 1,
            trail: []
        });
    }

    updateBullets(opponent) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            bullet.trail.unshift({ x: bullet.x, y: bullet.y });
            if (bullet.trail.length > 5) {
                bullet.trail.pop();
            }
            
            bullet.x += bullet.speed;

            if (this.checkBulletCollision(bullet, opponent)) {
                opponent.health = Math.max(0, opponent.health - bullet.damage);
                this.energy = Math.min(this.maxEnergy, this.energy + 15);
                opponent.onHit();
                this.createHitEffect(bullet.x, bullet.y);
                this.bullets.splice(i, 1);
                continue;
            }

            if (bullet.x < -50 || bullet.x > window.innerWidth + 50) {
                this.bullets.splice(i, 1);
            }
        }
    }

    checkBulletCollision(bullet, opponent) {
        return bullet.x < opponent.x + opponent.width &&
               bullet.x + bullet.size > opponent.x &&
               bullet.y < opponent.y + opponent.height &&
               bullet.y + bullet.size > opponent.y;
    }

    drawBullets(ctx) {
        ctx.save();
        for (const bullet of this.bullets) {
            if (bullet.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(bullet.trail[0].x, bullet.trail[0].y);
                for (let i = 1; i < bullet.trail.length; i++) {
                    ctx.lineTo(bullet.trail[i].x, bullet.trail[i].y);
                }
                ctx.strokeStyle = bullet.color;
                ctx.lineWidth = bullet.size * 0.8;
                ctx.lineCap = 'round';
                ctx.globalAlpha = 0.3;
                ctx.stroke();
            }
            
            ctx.globalAlpha = 1;
            ctx.shadowColor = bullet.color;
            ctx.shadowBlur = 20;
            
            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.setFullscreen();
        
        this.gameOver = false;
        this.winner = null;
        this.keys = {};

        this.background = document.getElementById('backgroundImage');
        
        this.background.onload = () => {
            this.draw();
        };
        
        this.titleAlpha = 0;
        this.titleScale = 0;
        this.titleAnimating = true;
        this.titleY = 0;
        
        this.initializePlayers();
        this.setupEventListeners();
        this.particles = [];

        this.platforms = [
            {
                x: this.canvas.width * 0.3,
                y: this.canvas.height * 0.6,
                width: 200,
                height: 30
            },
            {
                x: this.canvas.width * 0.6,
                y: this.canvas.height * 0.4,
                width: 200,
                height: 30
            },
            {
                x: this.canvas.width * 0.2,
                y: this.canvas.height * 0.3,
                width: 200,
                height: 30
            }
        ];

        this.fullscreenHint = {
            alpha: 1,
            visible: true
        };

        this.gameTime = 3 * 60; // 3分鐘，以秒為單位
        this.lastTime = Date.now();
        this.timeWarning = false; // 用於最後30秒的警告效果
    }

    setFullscreen() {
        this.resizeCanvas();
        
        window.addEventListener('resize', () => this.resizeCanvas());
        
        document.addEventListener('fullscreenchange', () => {
            this.resizeCanvas();
            if (document.fullscreenElement) {
                this.fullscreenHint.visible = false;
            }
        });
        
        this.canvas.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                this.canvas.requestFullscreen().catch(err => {
                    console.log(`全螢幕錯誤: ${err.message}`);
                });
            }
        });
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.titleY = this.canvas.height * 0.5;
        
        if (this.player1) {
            const groundY = this.canvas.height - 150;
            this.player1.groundY = groundY;
            this.player2.groundY = groundY;
            
            if (!this.player1.jumping) {
                this.player1.y = groundY;
            }
            if (!this.player2.jumping) {
                this.player2.y = groundY;
            }
            
            this.player1.speed = this.canvas.width * 0.006;
            this.player2.speed = this.canvas.width * 0.006;
        }

        this.platforms = [
            {
                x: this.canvas.width * 0.3,
                y: this.canvas.height * 0.6,
                width: 200,
                height: 30
            },
            {
                x: this.canvas.width * 0.6,
                y: this.canvas.height * 0.4,
                width: 200,
                height: 30
            },
            {
                x: this.canvas.width * 0.2,
                y: this.canvas.height * 0.3,
                width: 200,
                height: 30
            }
        ];
    }

    drawControls() {
        const fontSize = 16;
        const topMargin = 60;
        const lineHeight = 28;
        
        this.ctx.save();
        
        this.ctx.font = `${fontSize}px Arial`;
        const maxTextWidth = Math.max(
            this.ctx.measureText('必殺技 (能量滿時可使用)').width + 200,
            this.ctx.measureText('左右移動').width + 200
        );
        
        const columnWidth = maxTextWidth + 100;
        const boxWidth = columnWidth * 2 + 100;
        const boxHeight = lineHeight * 5 + 30;
        
        const x = (this.canvas.width - boxWidth) / 2;
        const y = topMargin;
        
        const gradient = this.ctx.createLinearGradient(x, y, x + boxWidth, y + boxHeight);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        gradient.addColorStop(1, 'rgba(20, 20, 40, 0.85)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, boxWidth, boxHeight, 15);
        this.ctx.fill();
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        const leftColumnX = x + 50;
        const rightColumnX = x + boxWidth/2 + 30;
        
        const keyX = 50;
        const actionX = 140;
        let textY = y + 40;
        
        const drawControlRow = (keyText, actionText, startX, y, titleColor = null) => {
            if (titleColor) {
                this.ctx.font = `bold ${fontSize + 2}px Arial`;
                this.ctx.fillStyle = titleColor;
                this.ctx.textAlign = 'left';
                this.ctx.fillText(keyText, startX, y);
                return;
            }

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            const metrics = this.ctx.measureText(keyText);
            const keyWidth = metrics.width + 16;
            const keyHeight = 22;
            
            this.ctx.beginPath();
            this.ctx.roundRect(startX + keyX - 8, y - 16, keyWidth, keyHeight, 6);
            this.ctx.fill();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            this.ctx.font = `${fontSize}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(keyText, startX + keyX + keyWidth/2 - 8, y);
            
            this.ctx.textAlign = 'left';
            this.ctx.fillText(actionText, startX + actionX, y);
        };

        drawControlRow('玩家一控制', '', leftColumnX, textY, '#88f');
        textY += lineHeight;
        drawControlRow('W', '跳躍', leftColumnX, textY);
        textY += lineHeight;
        drawControlRow('A / D', '左右移動', leftColumnX, textY);
        textY += lineHeight;
        drawControlRow('F', '攻擊', leftColumnX, textY);
        textY += lineHeight;
        drawControlRow('R', '必殺技 (能量滿時可使用)', leftColumnX, textY);

        textY = y + 40;
        
        drawControlRow('玩家二控制', '', rightColumnX, textY, '#f88');
        textY += lineHeight;
        drawControlRow('↑', '跳躍', rightColumnX, textY);
        textY += lineHeight;
        drawControlRow('← / →', '左右移動', rightColumnX, textY);
        textY += lineHeight;
        drawControlRow('/', '攻擊', rightColumnX, textY);
        textY += lineHeight;
        drawControlRow('.', '必殺技 (能量滿時可使用)', rightColumnX, textY);

        this.ctx.restore();
    }

    initializePlayers() {
        const groundY = this.canvas.height - 150;
        
        this.player1 = new Fighter(
            this.canvas.width * 0.2,
            groundY,
            'blue',
            {
                left: 'KeyA',
                right: 'KeyD',
                up: 'KeyW',
                attack: 'KeyF',
                super: 'KeyR'
            },
            true,
            "玩家一",
            "1"
        );

        this.player2 = new Fighter(
            this.canvas.width * 0.8,
            groundY,
            'red',
            {
                left: 'ArrowLeft',
                right: 'ArrowRight',
                up: 'ArrowUp',
                attack: 'Slash',
                super: 'Period'
            },
            false,
            "玩家二",
            "2"
        );
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Space' && this.gameOver) {
                this.resetGame();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    resetGame() {
        this.initializePlayers();
        this.gameOver = false;
        this.winner = null;
        this.particles = [];
        this.gameTime = 3 * 60; // 重置計時器
        this.lastTime = Date.now();
        this.timeWarning = false;
        
        const effects = document.querySelectorAll('.effect');
        effects.forEach(effect => effect.remove());
    }

    checkWinner() {
        if (this.player1.health <= 0) {
            if (!this.gameOver) {
                this.gameOver = true;
                this.winner = this.player2;
                this.player1.isDead = true;
                this.createVictoryEffect();
            }
        } else if (this.player2.health <= 0) {
            if (!this.gameOver) {
                this.gameOver = true;
                this.winner = this.player1;
                this.player2.isDead = true;
                this.createVictoryEffect();
            }
        }
    }

    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 72px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('遊戲結束!', this.canvas.width/2, this.canvas.height/2 - 80);
        
        this.ctx.fillStyle = this.winner === this.player1 ? '#88f' : '#f88';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.fillText(`${this.winner.name} 獲勝!`, this.canvas.width/2, this.canvas.height/2);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '32px Arial';
        this.ctx.fillText('按空白鍵重新開始', this.canvas.width/2, this.canvas.height/2 + 100);
        
        const lineWidth = 400;
        const lineY = this.canvas.height/2 + 40;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width/2 - lineWidth/2, lineY);
        this.ctx.lineTo(this.canvas.width/2 + lineWidth/2, lineY);
        this.ctx.stroke();
        
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }

    update() {
        if (!this.gameOver) {
            this.updateTimer(); // 添加計時器更新
            this.player1.move(this.keys);
            this.player2.move(this.keys);
            
            if (!this.checkPlatformCollision(this.player1)) {
                this.player1.jumping = true;
            }
            if (!this.checkPlatformCollision(this.player2)) {
                this.player2.jumping = true;
            }
            
            this.player1.updateBullets(this.player2);
            this.player2.updateBullets(this.player1);
            
            this.checkWinner();
        }
        this.updateParticles();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.background.complete) {
            const scale = Math.max(
                this.canvas.width / this.background.width,
                this.canvas.height / this.background.height
            );
            const scaledWidth = this.background.width * scale;
            const scaledHeight = this.background.height * scale;
            const x = (this.canvas.width - scaledWidth) / 2;
            const y = (this.canvas.height - scaledHeight) / 2;
            
            this.ctx.drawImage(
                this.background,
                x, y,
                scaledWidth,
                scaledHeight
            );
        }

        this.drawTitle();

        this.drawPlatforms();

        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);

        this.drawTopBars();
        this.drawTimer(); // 添加計時器繪製
        this.drawControls();
        
        this.drawFullscreenHint();
        
        if (this.gameOver) {
            this.drawGameOver();
            this.drawParticles();
        }
    }

    drawTopBars() {
        const barWidth = 300;
        const barHeight = 20;
        const margin = 10;
        
        this.ctx.fillStyle = "#500";
        this.ctx.fillRect(margin, margin, barWidth, barHeight);
        this.ctx.fillStyle = `rgb(${255 * (1 - this.player1.health/100)}, ${255 * (this.player1.health/100)}, 0)`;
        this.ctx.fillRect(margin, margin, barWidth * (this.player1.health/100), barHeight);
        
        this.ctx.fillStyle = "#440";
        this.ctx.fillRect(margin, margin + barHeight + 5, barWidth, barHeight/2);
        this.ctx.fillStyle = "yellow";
        this.ctx.fillRect(margin, margin + barHeight + 5, barWidth * (this.player1.energy/this.player1.maxEnergy), barHeight/2);
        
        this.ctx.fillStyle = "#500";
        this.ctx.fillRect(this.canvas.width - margin - barWidth, margin, barWidth, barHeight);
        this.ctx.fillStyle = `rgb(${255 * (1 - this.player2.health/100)}, ${255 * (this.player2.health/100)}, 0)`;
        this.ctx.fillRect(this.canvas.width - margin - barWidth * (this.player2.health/100), margin, barWidth * (this.player2.health/100), barHeight);
        
        this.ctx.fillStyle = "#440";
        this.ctx.fillRect(this.canvas.width - margin - barWidth, margin + barHeight + 5, barWidth, barHeight/2);
        this.ctx.fillStyle = "yellow";
        this.ctx.fillRect(this.canvas.width - margin - barWidth * (this.player2.energy/this.player2.maxEnergy), margin + barHeight + 5, barWidth * (this.player2.energy/this.player2.maxEnergy), barHeight/2);
        
        this.ctx.fillStyle = "white";
        this.ctx.font = "20px Arial";
        this.ctx.textAlign = "left";
        this.ctx.fillText(this.player1.name, margin, margin + barHeight * 2 + 10);
        this.ctx.textAlign = "right";
        this.ctx.fillText(this.player2.name, this.canvas.width - margin, margin + barHeight * 2 + 10);
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    start() {
        this.gameLoop();
    }

    createVictoryEffect() {
        const colors = ['#FFD700', '#FFA500', '#FF4500', '#FF69B4', '#00FF00', '#1E90FF'];
        for (let i = 0; i < 100; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: this.canvas.height + 10,
                vx: (Math.random() - 0.5) * 8,
                vy: -Math.random() * 15 - 10,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                gravity: 0.3,
                alpha: 1
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.rotation += p.rotationSpeed;
            p.alpha = Math.max(0, p.alpha - 0.005);

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        this.ctx.save();
        for (const p of this.particles) {
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0');
            this.ctx.beginPath();
            this.ctx.moveTo(0, -p.size);
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5;
                const radius = i % 2 === 0 ? p.size : p.size / 2;
                this.ctx.lineTo(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius
                );
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        this.ctx.restore();
    }

    drawTitle() {
        if (!this.titleAnimating && this.titleAlpha <= 0) return;

        this.ctx.save();
        
        if (this.titleAnimating) {
            this.titleAlpha = Math.min(1, this.titleAlpha + 0.02);
            this.titleScale = Math.min(1, this.titleScale + 0.04);
            if (this.titleAlpha >= 1 && this.titleScale >= 1) {
                this.titleAnimating = false;
            }
        } else {
            const breathe = Math.sin(Date.now() * 0.002) * 0.1 + 0.9;
            this.titleScale = breathe;
        }

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        this.ctx.shadowColor = '#FFD700';
        this.ctx.shadowBlur = 30;
        
        const gradient = this.ctx.createLinearGradient(
            this.canvas.width/2 - 150,
            this.titleY - 50,
            this.canvas.width/2 + 150,
            this.titleY + 50
        );
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.5, '#FFF');
        gradient.addColorStop(1, '#FFD700');
        
        this.ctx.globalAlpha = this.titleAlpha;
        this.ctx.fillStyle = gradient;
        this.ctx.font = `bold ${100 * this.titleScale}px Arial`;
        this.ctx.fillText('TKUET', this.canvas.width/2, this.titleY);
        
        this.ctx.strokeStyle = '#B8860B';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText('TKUET', this.canvas.width/2, this.titleY);
        
        this.ctx.restore();
    }

    drawPlatforms() {
        this.ctx.save();
        
        for (const platform of this.platforms) {
            const gradient = this.ctx.createLinearGradient(
                platform.x, platform.y,
                platform.x, platform.y + platform.height
            );
            gradient.addColorStop(0, '#4a4a4a');
            gradient.addColorStop(1, '#2a2a2a');
            
            this.ctx.fillStyle = gradient;
            this.ctx.strokeStyle = '#666';
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            this.ctx.roundRect(
                platform.x, platform.y,
                platform.width, platform.height,
                5
            );
            this.ctx.fill();
            this.ctx.stroke();
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.fillRect(
                platform.x, platform.y,
                platform.width, platform.height * 0.3
            );
        }
        
        this.ctx.restore();
    }

    checkPlatformCollision(fighter) {
        for (const platform of this.platforms) {
            if (fighter.x + fighter.width > platform.x &&
                fighter.x < platform.x + platform.width) {
                
                if (fighter.y + fighter.height >= platform.y &&
                    fighter.y + fighter.height - fighter.jumpVelocity <= platform.y) {
                    fighter.y = platform.y - fighter.height;
                    fighter.jumping = false;
                    fighter.jumpVelocity = 0;
                    return true;
                }
            }
        }
        
        if (fighter.y + fighter.height < fighter.groundY) {
            return false;
        }
        
        return true;
    }

    drawFullscreenHint() {
        if (!this.fullscreenHint.visible || document.fullscreenElement) return;
        
        this.ctx.save();
        
        this.fullscreenHint.alpha = 0.3 + Math.abs(Math.sin(Date.now() * 0.002)) * 0.7;
        
        this.ctx.fillStyle = `rgba(255, 255, 255, ${this.fullscreenHint.alpha})`;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillText(
            '按下滑鼠進入全螢幕',
            this.canvas.width / 2,
            this.canvas.height - 30
        );
        
        this.ctx.restore();
    }

    updateTimer() {
        if (this.gameOver) return;
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // 轉換為秒
        this.lastTime = currentTime;
        
        this.gameTime = Math.max(0, this.gameTime - deltaTime);
        
        // 當時間到時結束遊戲
        if (this.gameTime <= 0) {
            this.gameOver = true;
            // 判斷獲勝者（血量較高者獲勝）
            if (this.player1.health > this.player2.health) {
                this.winner = this.player1;
                this.player2.isDead = true;
            } else if (this.player2.health > this.player1.health) {
                this.winner = this.player2;
                this.player1.isDead = true;
            } else {
                // 平手情況
                this.winner = { name: "平手" };
            }
            this.createVictoryEffect();
        }
        
        // 最後30秒時啟動警告效果
        this.timeWarning = this.gameTime <= 30;
    }

    drawTimer() {
        this.ctx.save();
        
        // 計算分和秒
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        
        // 設置文字樣式
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
        // 當剩餘時間少於30秒時，使用紅色並添加閃爍效果
        if (this.timeWarning) {
            const alpha = 0.5 + Math.abs(Math.sin(Date.now() * 0.01)) * 0.5;
            this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            this.ctx.shadowColor = 'red';
            this.ctx.shadowBlur = 10;
        } else {
            this.ctx.fillStyle = 'white';
            this.ctx.shadowColor = 'black';
            this.ctx.shadowBlur = 5;
        }
        
        // 繪製時間
        const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.ctx.fillText(timeText, this.canvas.width / 2, 10);
        
        this.ctx.restore();
    }
}

function checkCollision(attacker, defender) {
    if (!attacker.isAttackActive) return;

    const attackBox = attacker.getAttackBox();
    const defenderBox = {
        x: defender.x,
        y: defender.y,
        width: defender.width,
        height: defender.height
    };

    if (attackBox.x < defenderBox.x + defenderBox.width &&
        attackBox.x + attackBox.width > defenderBox.x &&
        attackBox.y < defenderBox.y + defenderBox.height &&
        attackBox.y + attackBox.height > defenderBox.y) {
        
        const damage = attacker.isSuper ? attacker.attackDamage * 2 : attacker.attackDamage;
        defender.health = Math.max(0, defender.health - damage);
        
        attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 15);
        
        defender.onHit();
    }
}

const game = new Game();
game.start(); 