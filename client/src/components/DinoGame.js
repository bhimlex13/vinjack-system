import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

const DinoGame = () => {
  const canvasRef = useRef(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let gameSpeed = 5;
    let gravity = 0.6;

    let dino = {
      x: 50,
      y: 150,
      width: 40,
      height: 40,
      dy: 0,
      jumpForce: 10,
      originalHeight: 40,
      grounded: false,
      jumpTimer: 0
    };

    let obstacles = [];
    let scoreCounter = 0;

    const spawnObstacle = () => {
      let size = Math.random() * (40 - 20) + 20;
      let obstacle = {
        x: canvas.width,
        y: canvas.height - size,
        width: size,
        height: size,
      };
      obstacles.push(obstacle);
    };

    let spawnTimer = 100;
    let initialSpawnTimer = 100;

    const reset = () => {
      dino.y = 150;
      dino.dy = 0;
      obstacles = [];
      scoreCounter = 0;
      gameSpeed = 5;
      setIsGameOver(false);
      setScore(0);
    };

    const drawDino = () => {
      ctx.beginPath();
      // Simple representation of a motorcycle using rectangles
      ctx.fillStyle = '#1976d2'; // MUI Primary color
      ctx.fillRect(dino.x, dino.y, dino.width, dino.height);
      
      // Wheels
      ctx.fillStyle = '#333';
      ctx.arc(dino.x + 10, dino.y + dino.height, 8, 0, Math.PI * 2);
      ctx.arc(dino.x + dino.width - 10, dino.y + dino.height, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
    };

    const drawObstacle = (obstacle) => {
      ctx.beginPath();
      ctx.fillStyle = '#d32f2f'; // MUI Error color for obstacle (e.g. a broken tire/cone)
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      ctx.closePath();
    };

    const jump = () => {
      if (dino.grounded) {
        dino.dy = -dino.jumpForce;
        dino.grounded = false;
      }
    };

    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (isGameOver) {
           reset();
        } else {
           jump();
        }
      }
    };

    const handleClick = () => {
      if (isGameOver) {
         reset();
      } else {
         jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('click', handleClick);

    const update = () => {
      if (isGameOver) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply Gravity
      dino.y += dino.dy;
      if (dino.y + dino.height < canvas.height) {
        dino.dy += gravity;
        dino.grounded = false;
      } else {
        dino.dy = 0;
        dino.grounded = true;
        dino.y = canvas.height - dino.height;
      }

      drawDino();

      spawnTimer--;
      if (spawnTimer <= 0) {
        spawnObstacle();
        spawnTimer = initialSpawnTimer - (gameSpeed * 2);
        if (spawnTimer < 40) spawnTimer = 40;
      }

      for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;
        drawObstacle(obs);

        // Collision detection
        if (
          dino.x < obs.x + obs.width &&
          dino.x + dino.width > obs.x &&
          dino.y < obs.y + obs.height &&
          dino.y + dino.height > obs.y
        ) {
          setIsGameOver(true);
        }
      }

      // Remove off-screen obstacles
      obstacles = obstacles.filter(obs => obs.x + obs.width > 0);

      scoreCounter++;
      if (scoreCounter % 10 === 0) {
        setScore(Math.floor(scoreCounter / 10));
      }
      if (scoreCounter % 500 === 0) {
        gameSpeed += 1;
      }

      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isGameOver]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 4 }}>
      <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
        Waiting for the server to wake up... (Free hosting limits!)
      </Typography>
      <Typography variant="body1" color="text.primary" sx={{ mb: 2 }}>
        Score: {score}
      </Typography>
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={200} 
        style={{ border: '2px solid #ccc', borderRadius: '8px', cursor: 'pointer', background: '#f5f5f5' }} 
      />
      {isGameOver && (
        <Typography variant="h6" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
          Game Over! Press Space or Click canvas to restart.
        </Typography>
      )}
      {!isGameOver && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Press Space or Click the canvas to jump over obstacles.
        </Typography>
      )}
    </Box>
  );
};

export default DinoGame;
