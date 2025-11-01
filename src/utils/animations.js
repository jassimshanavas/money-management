// Confetti animation for goal achievements
export const triggerConfetti = () => {
  const colors = ['#14b8a6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const confettiCount = 100;
  const duration = 3000;

  for (let i = 0; i < confettiCount; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 10 + 5;
      const startX = Math.random() * window.innerWidth;
      const startY = -20;
      const endY = window.innerHeight + 20;
      const endX = startX + (Math.random() - 0.5) * 200;

      confetti.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top: ${startY}px;
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        opacity: 1;
      `;

      document.body.appendChild(confetti);

      confetti.animate(
        [
          {
            transform: `translate(0, 0) rotate(0deg)`,
            opacity: 1,
          },
          {
            transform: `translate(${endX - startX}px, ${endY - startY}px) rotate(720deg)`,
            opacity: 0,
          },
        ],
        {
          duration: duration + Math.random() * 1000,
          easing: 'cubic-bezier(0.5, 0, 0.5, 1)',
        }
      ).onfinish = () => confetti.remove();
    }, Math.random() * 500);
  }
};

// Pulse animation for notifications
export const pulseAnimation = (element) => {
  if (!element) return;
  
  element.animate(
    [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.1)', opacity: 0.8 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    {
      duration: 600,
      easing: 'ease-in-out',
    }
  );
};

