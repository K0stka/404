// Check for reduced motion preference and update dynamically
let prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Listen for changes in motion preference
const motionMediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
motionMediaQuery.addEventListener("change", (e) => {
	prefersReducedMotion = e.matches;
	// Update glow data when preference changes
	glowData.forEach((g, i) => {
		g.amplitude = prefersReducedMotion ? 2 : 8 + Math.random() * 12 + i * 2;
		g.freq = prefersReducedMotion ? 0.1 : 0.5 + Math.random() * 0.7 + i * 0.1;
		g.cursorInfluence = prefersReducedMotion ? 0.02 : 0.12 + Math.random() * 0.08;
	});
});

// Display the current URL in a user-friendly format
const urlElement = document.getElementById("url");
if (urlElement) {
	const currentUrl = window.location.href;
	urlElement.textContent = currentUrl;
}

// Optimized Organic Glow Animation
const glows = Array.from(document.querySelectorAll(".glow"));
const glowData = glows.map((glow, i) => {
	const style = window.getComputedStyle(glow);
	return {
		glow,
		baseTop: parseFloat(style.getPropertyValue("--t")),
		baseLeft: parseFloat(style.getPropertyValue("--l")),
		amplitude: prefersReducedMotion ? 2 : 8 + Math.random() * 12 + i * 2,
		freq: prefersReducedMotion ? 0.1 : 0.5 + Math.random() * 0.7 + i * 0.1,
		phase: Math.random() * Math.PI * 2,
		cursorInfluence: prefersReducedMotion ? 0.02 : 0.12 + Math.random() * 0.08,
		jelly: { x: 0, y: 0, vx: 0, vy: 0 },
		cachedRect: null,
		rectUpdateTime: 0,
	};
});

let mouseX = 0.5;
let mouseY = 0.5;
let isVisible = !document.hidden;
let animationId = null;

// Throttled mouse tracking for better performance
let mouseTrackingRaf = null;
let lastMouseUpdate = 0;
const MOUSE_THROTTLE = 16; // ~60fps

function updateMousePosition(e) {
	const now = performance.now();
	if (now - lastMouseUpdate < MOUSE_THROTTLE) return;

	lastMouseUpdate = now;
	const w = window.innerWidth;
	const h = window.innerHeight;
	mouseX = e.clientX / w;
	mouseY = e.clientY / h;
}

// Track mouse position for glow interaction
window.addEventListener("mousemove", updateMousePosition, { passive: true });

// Pause animations when tab is not visible
document.addEventListener("visibilitychange", () => {
	isVisible = !document.hidden;
	if (isVisible && !animationId && !prefersReducedMotion) {
		animationId = requestAnimationFrame(animateGlows);
	} else if (!isVisible && animationId) {
		cancelAnimationFrame(animationId);
		animationId = null;
	}
});

// Pause animations on window blur/focus
window.addEventListener("blur", () => {
	isVisible = false;
	if (animationId) {
		cancelAnimationFrame(animationId);
		animationId = null;
	}
});

window.addEventListener("focus", () => {
	isVisible = true;
	if (!animationId && !prefersReducedMotion) {
		animationId = requestAnimationFrame(animateGlows);
	}
});

// Optimized animate function with performance improvements
function animateGlows(timestamp) {
	if (!isVisible || prefersReducedMotion) return;

	try {
		const w = window.innerWidth;
		const h = window.innerHeight;
		const cursorPxX = mouseX * w;
		const cursorPxY = mouseY * h;
		const now = timestamp || performance.now();

		for (let i = 0; i < glowData.length; i++) {
			const g = glowData[i];
			if (!g.glow || !g.glow.isConnected) continue; // Skip if element was removed

			const t = now * 0.0005 * g.freq + g.phase;

			// Organic movement patterns (reduced calculations)
			const organicTop = g.baseTop + Math.sin(t) * g.amplitude + Math.cos(t * 0.7 + i) * g.amplitude * 0.5;
			const organicLeft =
				g.baseLeft + Math.cos(t * 0.9 + i) * g.amplitude + Math.sin(t * 0.6 + i) * g.amplitude * 0.5;

			// Cache getBoundingClientRect for better performance (update every 100ms)
			if (!g.cachedRect || now - g.rectUpdateTime > 100) {
				g.cachedRect = g.glow.getBoundingClientRect();
				g.rectUpdateTime = now;
			}

			// Mouse interaction with repulsion effect
			const glowCenterX = g.cachedRect.left + g.cachedRect.width / 2;
			const glowCenterY = g.cachedRect.top + g.cachedRect.height / 2;

			const dx = glowCenterX - cursorPxX;
			const dy = glowCenterY - cursorPxY;
			const distSq = dx * dx + dy * dy; // Use squared distance to avoid sqrt

			let repelStrength = 0;
			const repelRadius = Math.max(w, h) * 0.38;
			const repelRadiusSq = repelRadius * repelRadius;

			if (distSq < repelRadiusSq) {
				const dist = Math.sqrt(distSq);
				repelStrength = Math.pow(1 - dist / repelRadius, 1.7) * 120 * g.cursorInfluence;
			}

			const repelX = repelStrength * (dx / (Math.sqrt(distSq) || 1));
			const repelY = repelStrength * (dy / (Math.sqrt(distSq) || 1));

			// Jelly spring physics for smooth movement
			const stiffness = 0.18;
			const damping = 0.68;

			g.jelly.vx += (repelX - g.jelly.x) * stiffness;
			g.jelly.vy += (repelY - g.jelly.y) * stiffness;
			g.jelly.vx *= damping;
			g.jelly.vy *= damping;
			g.jelly.x += g.jelly.vx;
			g.jelly.y += g.jelly.vy;

			// Use transform instead of top/left for better performance
			const finalX = organicLeft - g.baseLeft + g.jelly.x;
			const finalY = organicTop - g.baseTop + g.jelly.y;
			g.glow.style.transform = `translate3d(${finalX}px, ${finalY}px, 0)`;
		}

		animationId = requestAnimationFrame(animateGlows);
	} catch (error) {
		console.warn("Animation error:", error);
		// Retry after a delay
		setTimeout(() => {
			if (!animationId && !prefersReducedMotion && isVisible) {
				animationId = requestAnimationFrame(animateGlows);
			}
		}, 100);
	}
}

// Start the animation only if motion is allowed and page is visible
if (!prefersReducedMotion && isVisible) {
	animationId = requestAnimationFrame(animateGlows);
}
