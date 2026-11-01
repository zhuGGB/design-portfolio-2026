const hero = document.querySelector('.hero');
const video = document.querySelector('.hero__video');
const title = document.querySelector('.hero__title');
const canvas = document.querySelector('.hero__title-canvas');
const context = canvas.getContext('2d');
const source = new Image();
const motionAllowed = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const introStack = document.querySelector('.intro-stack');
let parallaxFrame = 0;

function updateIntroParallax() {
  parallaxFrame = 0;
  const distance = Math.max(0, Math.min(window.scrollY - introStack.offsetTop, hero.offsetHeight));
  hero.style.setProperty('--hero-parallax-y', `${motionAllowed ? -distance * .36 : 0}px`);
}

function queueIntroParallax() {
  if (!parallaxFrame) parallaxFrame = requestAnimationFrame(updateIntroParallax);
}

window.addEventListener('scroll', queueIntroParallax, { passive: true });
window.addEventListener('resize', queueIntroParallax);
queueIntroParallax();
const ripples = [];
let frame = 0;
let sourcePixels;
let outputPixels;

source.onload = () => {
  context.drawImage(source, 0, 0);
  sourcePixels = context.getImageData(0, 0, canvas.width, canvas.height);
  outputPixels = context.createImageData(canvas.width, canvas.height);
  title.classList.add('is-ready');
};
source.src = './第1屏/标题.png';

video.addEventListener('error', () => hero.classList.add('is-fallback'));
video.play().catch(() => {
  // A still from the reference remains available if this browser cannot play video.
  if (video.error) hero.classList.add('is-fallback');
});

function draw(time) {
  frame = 0;
  for (let n = ripples.length - 1; n >= 0; n--) {
    if (time - ripples[n].time > 720) ripples.splice(n, 1);
  }

  if (!ripples.length) {
    context.putImageData(sourcePixels, 0, 0);
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const input = sourcePixels.data;
  const output = outputPixels.data;
  output.set(input);

  const radius = 150;
  const left = Math.max(0, Math.floor(Math.min(...ripples.map(r => r.x - radius))));
  const right = Math.min(width, Math.ceil(Math.max(...ripples.map(r => r.x + radius))));
  const top = Math.max(0, Math.floor(Math.min(...ripples.map(r => r.y - radius))));
  const bottom = Math.min(height, Math.ceil(Math.max(...ripples.map(r => r.y + radius))));

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      let shiftX = 0;
      let shiftY = 0;

      for (const ripple of ripples) {
        const dx = x - ripple.x;
        const dy = y - ripple.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= radius) continue;

        const age = time - ripple.time;
        const fade = Math.pow(1 - age / 720, 2);
        const envelope = Math.pow(1 - distance / radius, 2);
        const wave = Math.sin(distance / 16 - age / 55) * envelope * fade * 5;
        const direction = distance ? 1 / distance : 0;
        shiftX += dx * direction * wave;
        shiftY += dy * direction * wave;
      }

      if (shiftX === 0 && shiftY === 0) continue;
      const sampleX = Math.max(0, Math.min(width - 1.001, x + shiftX));
      const sampleY = Math.max(0, Math.min(height - 1.001, y + shiftY));
      const x0 = Math.floor(sampleX);
      const y0 = Math.floor(sampleY);
      const fx = sampleX - x0;
      const fy = sampleY - y0;
      const a = (y0 * width + x0) * 4;
      const b = a + 4;
      const c = a + width * 4;
      const d = c + 4;
      const target = (y * width + x) * 4;

      for (let channel = 0; channel < 4; channel++) {
        output[target + channel] =
          input[a + channel] * (1 - fx) * (1 - fy) +
          input[b + channel] * fx * (1 - fy) +
          input[c + channel] * (1 - fx) * fy +
          input[d + channel] * fx * fy;
      }
    }
  }

  context.putImageData(outputPixels, 0, 0);
  if (ripples.length) frame = requestAnimationFrame(draw);
}

function addRipple(event) {
  if (!motionAllowed || !source.complete || !source.naturalWidth) return;
  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width * canvas.width;
  const y = (event.clientY - bounds.top) / bounds.height * canvas.height;
  if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) return;
  const previous = ripples[ripples.length - 1];
  if (previous && performance.now() - previous.time < 90) return;
  ripples.push({ x, y, time: performance.now() });
  if (ripples.length > 4) ripples.shift();
  if (!frame) frame = requestAnimationFrame(draw);
}

title.addEventListener('pointermove', addRipple, { passive: true });
title.addEventListener('pointerdown', addRipple, { passive: true });

const contactButton = document.querySelector('.contact');
const contactDialog = document.querySelector('.contact-dialog');
if (contactButton && contactDialog && typeof contactDialog.showModal === 'function') {
  const contactClose = contactDialog.querySelector('.contact-dialog__close');
  contactButton.addEventListener('click', () => {
    contactDialog.showModal();
    document.body.classList.add('has-contact-dialog');
    contactClose.focus();
  });
  contactClose.addEventListener('click', () => contactDialog.close());
  contactDialog.addEventListener('click', event => {
    if (event.target === contactDialog) contactDialog.close();
  });
  contactDialog.addEventListener('close', () => {
    document.body.classList.remove('has-contact-dialog');
    contactButton.focus();
  });
}

const galleryTrack = document.querySelector('.gallery-screen__track');
if (galleryTrack) {
  const originalCards = [...galleryTrack.children];
  // Three identical groups keep the viewport filled while one group exits left.
  for (let copy = 0; copy < 2; copy++) {
    originalCards.forEach(card => galleryTrack.appendChild(card.cloneNode(true)));
  }

  const updateGalleryMotion = () => {
    const distance = galleryTrack.children[8].offsetLeft - galleryTrack.children[0].offsetLeft;
    galleryTrack.style.setProperty('--loop-distance', `${distance}px`);
    galleryTrack.style.setProperty('--loop-duration', `${distance / 78}s`);
    galleryTrack.classList.add('is-ready');
  };

  updateGalleryMotion();
  if ('ResizeObserver' in window) {
    new ResizeObserver(updateGalleryMotion).observe(galleryTrack.parentElement);
  } else {
    window.addEventListener('resize', updateGalleryMotion);
  }
}

const modelingCarousel = document.querySelector('.modeling-carousel');
if (modelingCarousel) {
  const cards = [...modelingCarousel.querySelectorAll('.modeling-carousel__card')];
  let phase = 0;
  let lastTime = 0;
  let visible = true;
  let paused = false;

  function renderModelingCarousel() {
    const width = modelingCarousel.clientWidth;
    cards.forEach((card, index) => {
      // The seam is hidden at either edge, where opacity reaches zero.
      const position = ((index - phase + 2.5 + 10) % 5) - 2.5;
      const depth = Math.abs(position);
      const travel = Math.sin(position * Math.PI / 5) * width * (width < 700 ? .62 : .34);
      const scale = 1 - depth * (width < 700 ? .16 : .125);
      const opacity = Math.min(1, Math.max(0, (2.5 - depth) / .8));
      card.style.transform = `translate(-50%, -50%) translateX(${travel}px) scale(${scale}) rotateY(${-position * 11}deg)`;
      card.style.opacity = opacity;
      card.style.zIndex = Math.round((2.5 - depth) * 100);
    });
  }

  function animateModelingCarousel(time) {
    if (lastTime && visible && !paused && motionAllowed) {
      phase = (phase + Math.min(time - lastTime, 64) / 3900) % 5;
      renderModelingCarousel();
    }
    lastTime = time;
    requestAnimationFrame(animateModelingCarousel);
  }

  modelingCarousel.addEventListener('focusin', () => { paused = true; });
  modelingCarousel.addEventListener('focusout', () => { paused = false; });
  modelingCarousel.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    phase = (phase + (event.key === 'ArrowRight' ? 1 : 4)) % 5;
    renderModelingCarousel();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(modelingCarousel);
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(renderModelingCarousel).observe(modelingCarousel);
  } else {
    window.addEventListener('resize', renderModelingCarousel);
  }
  renderModelingCarousel();
  requestAnimationFrame(animateModelingCarousel);
}

const aiGallery = document.querySelector('.ai-screen__gallery');
if (aiGallery) {
  const tracks = [...aiGallery.querySelectorAll('.ai-screen__track')];
  tracks.forEach(track => {
    const originals = [...track.children];
    for (let group = 0; group < 2; group++) {
      originals.forEach(image => {
        const copy = image.cloneNode(true);
        copy.alt = '';
        copy.setAttribute('aria-hidden', 'true');
        track.appendChild(copy);
      });
    }
  });

  const updateAiGallery = () => {
    tracks.forEach(track => {
      const distance = track.children[3].offsetTop - track.children[0].offsetTop;
      track.style.setProperty('--loop-distance', `${distance}px`);
      track.style.setProperty('--loop-duration', `${distance / 32}s`);
      track.classList.add('is-ready');
    });
  };

  updateAiGallery();
  if ('ResizeObserver' in window) {
    new ResizeObserver(updateAiGallery).observe(aiGallery);
  } else {
    window.addEventListener('resize', updateAiGallery);
  }
}

document.querySelectorAll('.interactive-arrow').forEach(arrow => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastAngle = 0;
  let rotation = 0;
  const pointerAngle = event => {
    const bounds = arrow.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    if (Math.hypot(x, y) < bounds.width * .1) return null;
    return Math.atan2(y, x) * 180 / Math.PI;
  };

  arrow.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    lastAngle = pointerAngle(event);
    arrow.classList.add('is-active');
  });

  arrow.addEventListener('pointermove', event => {
    if (!arrow.classList.contains('is-active') || reducedMotion.matches) return;
    const angle = pointerAngle(event);
    if (angle === null) return;
    if (lastAngle === null) { lastAngle = angle; return; }
    const delta = ((angle - lastAngle + 540) % 360) - 180;
    lastAngle = angle;
    rotation += Math.max(-45, Math.min(45, delta));
    arrow.style.setProperty('--arrow-rotation', `${rotation}deg`);
  });

  const resetArrow = () => {
    arrow.classList.remove('is-active');
    arrow.style.removeProperty('--arrow-rotation');
    rotation = 0;
  };
  arrow.addEventListener('pointerleave', resetArrow);
  arrow.addEventListener('pointercancel', resetArrow);
});

const projectDialog = document.querySelector('.project-dialog');
const projectCards = document.querySelectorAll('.commerce-card');
projectCards.forEach(card => card.addEventListener('dragstart', event => event.preventDefault()));
if (motionAllowed && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  projectCards.forEach(card => {
    let bounds = null;
    let pointerFrame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const updateTilt = () => {
      pointerFrame = 0;
      if (!bounds) return;
      const x = Math.max(-1, Math.min(1, (pointerX - bounds.left - bounds.width / 2) / (bounds.width / 2)));
      const y = Math.max(-1, Math.min(1, (pointerY - bounds.top - bounds.height / 2) / (bounds.height / 2)));
      card.style.setProperty('--tilt-x', `${(y * 9).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(-x * 10).toFixed(2)}deg`);
    };

    const trackPointer = event => {
      if (!bounds || event.pointerType !== 'mouse') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(updateTilt);
    };

    const resetTilt = () => {
      bounds = null;
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame = 0;
      card.classList.remove('is-tilting');
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
    };

    card.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      bounds = card.getBoundingClientRect();
      card.classList.add('is-tilting');
      trackPointer(event);
    });
    card.addEventListener('pointermove', trackPointer, { passive: true });
    card.addEventListener('pointerleave', resetTilt);
    card.addEventListener('pointercancel', resetTilt);
    card.addEventListener('click', resetTilt);
  });
}
if (projectDialog && typeof projectDialog.showModal === 'function') {
  const projectCategory = projectDialog.querySelector('.project-dialog__category');
  const projectTitle = projectDialog.querySelector('#project-dialog-title');
  const projectContent = projectDialog.querySelector('.project-dialog__content');
  const projectImage = projectDialog.querySelector('.project-dialog__image');
  const projectStatus = projectDialog.querySelector('.project-dialog__status');
  const closeButton = projectDialog.querySelector('.project-dialog__close');
  let lastTrigger = null;

  projectCards.forEach(card => {
    card.addEventListener('click', event => {
      event.preventDefault();
      lastTrigger = card;
      projectCategory.textContent = card.dataset.category;
      projectTitle.textContent = card.dataset.title;
      projectImage.classList.remove('is-loaded');
      projectImage.alt = `${card.dataset.title}完整作品图`;
      projectStatus.textContent = '作品加载中…';
      projectStatus.hidden = false;
      projectContent.scrollTop = 0;
      projectImage.onload = () => {
        projectImage.classList.add('is-loaded');
        projectStatus.hidden = true;
        projectContent.scrollTop = 0;
      };
      projectImage.onerror = () => {
        projectStatus.textContent = '图片暂时无法加载，请稍后重试。';
      };
      projectImage.src = card.href;
      projectDialog.showModal();
      document.body.classList.add('has-project-dialog');
      closeButton.focus();
    });
  });

  closeButton.addEventListener('click', () => projectDialog.close());
  projectDialog.addEventListener('click', event => {
    if (event.target === projectDialog) projectDialog.close();
  });
  projectDialog.addEventListener('close', () => {
    document.body.classList.remove('has-project-dialog');
    projectImage.onload = null;
    projectImage.onerror = null;
    projectImage.removeAttribute('src');
    projectImage.classList.remove('is-loaded');
    lastTrigger?.focus();
  });
}
