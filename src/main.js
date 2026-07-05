import './style.css';

// ==========================================================================
// CONFIGURACIÓN DE API Y ESTADOS DEL NEGOCIO
// ==========================================================================
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const BUSINESS_SLUG = 'atmosfera';

let workerId = '';
let serviceId = '';

let currentStep = 1;
const formData = {
  firstName: '',
  lastName: '',
  selectedDate: '',
  selectedTime: '',
  email: '',
  phone: '',
  notes: ''
};

let availableDates = [];
let isCustomSuggestion = false;

// Elementos del DOM del formulario
const form = document.getElementById('progressive-form');
const panels = {
  1: document.getElementById('step-panel-1'),
  2: document.getElementById('step-panel-2'),
  3: document.getElementById('step-panel-3'),
  4: document.getElementById('step-panel-4'),
  success: document.getElementById('step-panel-success')
};

// ==========================================================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================================================
async function init() {
  // 1. Iniciar Animaciones y Efectos Visuales Originales
  initVisualEffects();

  try {
    // 2. Obtener IDs del backend de Agenda para 'atmosfera'
    await fetchBusinessSettings();
    
    // 3. Generar el slider de calendario
    generateDateSlider();
    
    // Configurar fecha mínima para sugerencias personalizadas (hoy)
    const customDateInput = document.getElementById('input-custom-date');
    if (customDateInput) {
      customDateInput.min = formatDateToYYYYMMDD(new Date());
    }
    
    // 4. Configurar eventos de los botones y navegación del formulario
    setupFormEventListeners();
  } catch (error) {
    console.error("Error al inicializar la conexión con el servidor de Agenda:", error);
    // Fallback de desarrollo para que el formulario no quede bloqueado
    setupFormEventListeners();
  }
}

// ==========================================================================
// EFECTOS VISUALES ORIGINALES (CURSOR + NIEBLA CANVAS + REVEALS)
// ==========================================================================
function initVisualEffects() {
  // A. Cursor personalizado
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');
  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top  = mouseY + 'px';
  });

  function animateRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';
    requestAnimationFrame(animateRing);
  }
  animateRing();

  // Agrandar cursor en hover de elementos interactivos
  function applyCursorHoverEffects() {
    document.querySelectorAll('a, button, .servicio-item, .como-item, .date-slide-btn, .slot-btn, .btn-calendar-nav').forEach(el => {
      // Evitar duplicar listeners
      el.removeEventListener('mouseenter', onMouseEnterInteractive);
      el.removeEventListener('mouseleave', onMouseLeaveInteractive);
      
      el.addEventListener('mouseenter', onMouseEnterInteractive);
      el.addEventListener('mouseleave', onMouseLeaveInteractive);
    });
  }

  function onMouseEnterInteractive() {
    ring.style.width  = '50px';
    ring.style.height = '50px';
    ring.style.borderColor = 'var(--niebla)';
  }

  function onMouseLeaveInteractive() {
    ring.style.width  = '28px';
    ring.style.height = '28px';
    ring.style.borderColor = 'var(--niebla-claro)';
  }

  // Exponer para poder reaplicar hover en elementos dinámicos
  window.refreshCursorHovers = applyCursorHoverEffects;
  applyCursorHoverEffects();

  // B. Partículas flotantes — Canvas Niebla
  const canvas = document.getElementById('nieblaCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const COLORS = [
      'rgba(138,155,174,',   // azul niebla
      'rgba(184,198,209,',   // azul claro
      'rgba(181,168,152,',   // tierra
      'rgba(220,228,234,',   // azul muy claro
    ];

    let canvasMouseX = -999;
    let canvasMouseY = -999;

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      canvasMouseX = e.clientX - rect.left;
      canvasMouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseleave', () => {
      canvasMouseX = -999;
      canvasMouseY = -999;
    });

    const particles = Array.from({ length: 110 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 2.2 + 0.6,
      alpha: Math.random() * 0.28 + 0.08,
      vx:    (Math.random() - 0.5) * 0.4,
      vy:    (Math.random() - 0.5) * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.026 + 0.008,
    }));

    const RADIO = 90; // Radio de influencia del mouse

    function drawParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        const dx = p.x - canvasMouseX;
        const dy = p.y - canvasMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 1. Repulsión del cursor
        if (dist < RADIO && dist > 0) {
          const fuerza = (RADIO - dist) / RADIO;
          p.vx += (dx / dist) * fuerza * 0.45;
          p.vy += (dy / dist) * fuerza * 0.45;
        }

        // 2. Movimiento flotante browniano (simula corrientes de aire / polvo)
        p.vx += (Math.random() - 0.5) * 0.045;
        p.vy += (Math.random() - 0.5) * 0.045;

        // Leve corriente ascendente y lateral (efecto térmico de la luz)
        p.vx += 0.0025;
        p.vy -= 0.0055;

        // Damping / Fricción
        p.vx *= 0.96;
        p.vy *= 0.96;

        // Limitar velocidad para un flote calmo pero apreciable
        const maxSpeed = 0.95;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed;
          p.vy = (p.vy / speed) * maxSpeed;
        }

        // 3. Brillo parpadeante al flotar (atrapando la luz)
        p.pulse += p.pulseSpeed;
        const opacity = p.alpha + Math.sin(p.pulse) * p.alpha * 0.8;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.max(0.01, Math.min(0.9, opacity)) + ')';
        ctx.fill();

        // 4. Actualizar posición
        p.x += p.vx;
        p.y += p.vy;

        // Envoltura de bordes
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;
      });

      requestAnimationFrame(drawParticles);
    }
    drawParticles();
  }

  // C. Scroll reveal observer
  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  reveals.forEach(el => observer.observe(el));
}

// ==========================================================================
// CONEXIÓN CON BACKEND Y OBTENCIÓN DE CONFIGURACIÓN
// ==========================================================================
async function fetchBusinessSettings() {
  // Obtener Consultor
  const workersRes = await fetch(`${API_URL}/users/workers`, {
    headers: { 'x-business-slug': BUSINESS_SLUG }
  });
  if (!workersRes.ok) throw new Error("Error al obtener profesionales");
  const workersData = await workersRes.json();
  const worker = workersData.payload.find(w => w.email.includes('contacto@atmosfera.com')) || workersData.payload[0];
  if (!worker) throw new Error("No se encontró ningún trabajador");
  workerId = worker._id;

  // Obtener Servicio
  const servicesRes = await fetch(`${API_URL}/services`, {
    headers: { 'x-business-slug': BUSINESS_SLUG }
  });
  if (!servicesRes.ok) throw new Error("Error al obtener servicios");
  const servicesData = await servicesRes.json();
  const service = servicesData.payload.find(s => s.name === 'Reunión Online') || servicesData.payload[0];
  if (!service) throw new Error("No se encontró ningún servicio");
  serviceId = service._id;
  
  console.log(`Configuración cargada. Worker = ${workerId}, Service = ${serviceId}`);
}

// ==========================================================================
// GESTIÓN DEL CALENDARIO Y SLIDER
// ==========================================================================
function generateDateSlider() {
  const datesContainer = document.getElementById('dates-slider-wrapper');
  datesContainer.innerHTML = '';
  availableDates = [];
  
  const today = new Date();
  let daysAdded = 0;
  let offset = 0;

  // Generamos los próximos 10 días hábiles
  while (daysAdded < 10) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    
    // Evitar fines de semana
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      availableDates.push(d);
      daysAdded++;
    }
    offset++;
  }

  // Renderizar las fechas
  availableDates.forEach((date, index) => {
    const dateStr = formatDateToYYYYMMDD(date);
    const dayName = date.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '');
    const dayNum = date.getDate();
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `date-slide-btn ${index === 0 ? 'selected' : ''}`;
    btn.dataset.date = dateStr;
    btn.innerHTML = `
      <span class="date-slide-dayname">${dayName}</span>
      <span class="date-slide-daynum">${dayNum}</span>
    `;
    
    btn.addEventListener('click', () => {
      document.querySelectorAll('.date-slide-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectDate(dateStr);
    });
    
    datesContainer.appendChild(btn);
  });

  updateMonthDisplay(availableDates[0]);
  selectDate(formatDateToYYYYMMDD(availableDates[0]));
}

function updateMonthDisplay(date) {
  const monthDisplay = document.getElementById('display-current-month');
  if (monthDisplay) {
    const monthName = date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    monthDisplay.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  }
}

// Cargar disponibilidad para el día seleccionado
async function selectDate(dateStr) {
  isCustomSuggestion = false;
  formData.selectedDate = dateStr;
  document.getElementById('input-selected-date').value = dateStr;
  formData.selectedTime = '';
  document.getElementById('input-selected-time').value = '';
  
  const dateObj = parseYYYYMMDD(dateStr);
  const formattedLong = dateObj.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('display-selected-date-long').textContent = formattedLong;

  // Limpiar grids y alertas
  document.getElementById('nearest-slot-banner').classList.add('hidden');
  document.getElementById('slots-empty-state').classList.add('hidden');
  document.getElementById('slots-grid').innerHTML = '';
  document.getElementById('error-slot-selection').textContent = '';

  const loader = document.getElementById('slots-loader');
  loader.classList.remove('hidden');

  try {
    const res = await fetch(`${API_URL}/availability/slots?workerId=${workerId}&serviceId=${serviceId}&date=${dateStr}`, {
      headers: { 'x-business-slug': BUSINESS_SLUG }
    });
    if (!res.ok) throw new Error("Error al obtener disponibilidad de slots");
    const data = await res.json();
    const slots = data.payload;

    loader.classList.add('hidden');
    renderSlots(slots);
  } catch (error) {
    loader.classList.add('hidden');
    console.error("Error al obtener slots:", error);
    document.getElementById('error-slot-selection').textContent = "No se pudo conectar con el sistema de disponibilidad.";
  }
}

function renderSlots(slots) {
  const grid = document.getElementById('slots-grid');
  grid.innerHTML = '';

  const availableSlots = slots.filter(s => s.available);

  if (availableSlots.length === 0) {
    document.getElementById('slots-empty-state').classList.remove('hidden');
    findAlternativeSuggestion(formData.selectedDate);
    return;
  }

  // 1. Mostrar banner de hora más próxima
  const nearestSlot = availableSlots[0];
  const nearestBanner = document.getElementById('nearest-slot-banner');
  const displayNearestTime = document.getElementById('display-nearest-time');
  
  const isTodayDate = isToday(parseYYYYMMDD(formData.selectedDate));
  const dateLabel = isTodayDate ? 'hoy' : parseYYYYMMDD(formData.selectedDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  
  displayNearestTime.textContent = `${formatTimeTo12h(nearestSlot.startTime)} (${dateLabel})`;
  nearestBanner.classList.remove('hidden');

  const btnSelectNearest = document.getElementById('btn-select-nearest');
  const newBtn = btnSelectNearest.cloneNode(true);
  btnSelectNearest.parentNode.replaceChild(newBtn, btnSelectNearest);
  newBtn.addEventListener('click', () => {
    selectSlotElement(nearestSlot.startTime);
    goToStep(3);
  });

  // 2. Renderizar todas las horas
  slots.forEach(slot => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `slot-btn ${!slot.available ? 'disabled' : ''}`;
    btn.disabled = !slot.available;
    btn.textContent = formatTimeTo12h(slot.startTime);
    btn.dataset.time = slot.startTime;

    if (slot.available) {
      btn.addEventListener('click', () => {
        selectSlotElement(slot.startTime);
      });
    }

    grid.appendChild(btn);
  });

  // Re-aplicar efecto hover del cursor personalizado a los nuevos botones
  if (window.refreshCursorHovers) window.refreshCursorHovers();
}

function selectSlotElement(timeStr) {
  isCustomSuggestion = false;
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  
  const btn = Array.from(document.querySelectorAll('.slot-btn')).find(b => b.dataset.time === timeStr);
  if (btn) {
    btn.classList.add('selected');
  }

  formData.selectedTime = timeStr;
  document.getElementById('input-selected-time').value = timeStr;
  document.getElementById('error-slot-selection').textContent = '';
}

// Buscar día con agenda disponible cuando el seleccionado está completo
async function findAlternativeSuggestion(baseDateStr) {
  const suggestionBox = document.getElementById('suggestion-box');
  suggestionBox.classList.add('hidden');

  let checkDate = parseYYYYMMDD(baseDateStr);
  let found = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!found && attempts < maxAttempts) {
    checkDate.setDate(checkDate.getDate() + 1);
    
    // Saltar fines de semana
    if (checkDate.getDay() === 0) checkDate.setDate(checkDate.getDate() + 1);
    if (checkDate.getDay() === 6) checkDate.setDate(checkDate.getDate() + 2);
    
    const checkDateStr = formatDateToYYYYMMDD(checkDate);
    attempts++;

    try {
      const res = await fetch(`${API_URL}/availability/slots?workerId=${workerId}&serviceId=${serviceId}&date=${checkDateStr}`, {
        headers: { 'x-business-slug': BUSINESS_SLUG }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const slots = data.payload;
      const availableSlot = slots.find(s => s.available);

      if (availableSlot) {
        found = true;
        
        const dateLabel = checkDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeLabel = formatTimeTo12h(availableSlot.startTime);
        
        document.getElementById('suggested-slot-date').textContent = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
        document.getElementById('suggested-slot-time').textContent = timeLabel;
        
        suggestionBox.classList.remove('hidden');

        // Configurar botón
        const btnAccept = document.getElementById('btn-accept-suggestion');
        const newBtn = btnAccept.cloneNode(true);
        btnAccept.parentNode.replaceChild(newBtn, btnAccept);
        newBtn.addEventListener('click', () => {
          // Guardar selección en variables de estado
          formData.selectedDate = checkDateStr;
          formData.selectedTime = availableSlot.startTime;
          document.getElementById('input-selected-date').value = checkDateStr;
          document.getElementById('input-selected-time').value = availableSlot.startTime;
          isCustomSuggestion = false;
          
          // Actualizar visualmente la fecha seleccionada
          const dateObj = parseYYYYMMDD(checkDateStr);
          const formattedLong = dateObj.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
          document.getElementById('display-selected-date-long').textContent = formattedLong;
          
          // Marcar botón en el slider si está presente
          const slideBtn = Array.from(document.querySelectorAll('.date-slide-btn')).find(b => b.dataset.date === checkDateStr);
          if (slideBtn) {
            document.querySelectorAll('.date-slide-btn').forEach(b => b.classList.remove('selected'));
            slideBtn.classList.add('selected');
          }
          
          // Cargar el grid en segundo plano para que esté listo si el usuario retrocede
          fetch(`${API_URL}/availability/slots?workerId=${workerId}&serviceId=${serviceId}&date=${checkDateStr}`, {
            headers: { 'x-business-slug': BUSINESS_SLUG }
          }).then(res => res.json()).then(data => {
            renderSlots(data.payload);
            selectSlotElement(availableSlot.startTime);
          }).catch(err => console.warn("Error en background slot render:", err));
          
          // Avanzar inmediatamente al paso 3 (contacto)
          goToStep(3);
        });
        
        if (window.refreshCursorHovers) window.refreshCursorHovers();
      }
    } catch (e) {
      console.warn("Error al buscar sugerencia:", e);
    }
  }
}

// ==========================================================================
// EVENTOS DE BOTONES Y NAVEGACIÓN
// ==========================================================================
function setupFormEventListeners() {
  // Paso 1 -> 2
  document.getElementById('btn-goto-step-2').addEventListener('click', () => {
    if (validateStep1()) {
      formData.firstName = document.getElementById('input-firstname').value.trim();
      formData.lastName = document.getElementById('input-lastname').value.trim();
      
      document.getElementById('display-client-name').textContent = formData.firstName;
      document.getElementById('display-client-name-step3').textContent = formData.firstName;
      
      goToStep(2);
    }
  });

  // Paso 2 -> 3
  document.getElementById('btn-goto-step-3').addEventListener('click', () => {
    if (validateStep2()) {
      goToStep(3);
    }
  });

  // Paso 3 -> 4
  document.getElementById('btn-goto-step-4').addEventListener('click', () => {
    if (validateStep3()) {
      formData.email = document.getElementById('input-email').value.trim();
      formData.phone = document.getElementById('input-phone').value.trim();
      
      const dateObj = parseYYYYMMDD(formData.selectedDate);
      const dayStr = dateObj.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
      const timeStr = formatTimeTo12h(formData.selectedTime);
      
      document.getElementById('preview-date-time').textContent = `${dayStr} a las ${timeStr}`;
      document.getElementById('preview-participant').textContent = `${formData.firstName} ${formData.lastName}`;
      
      goToStep(4);
    }
  });

  // Botones Atrás
  document.getElementById('btn-back-to-step-1').addEventListener('click', () => goToStep(1));
  document.getElementById('btn-back-to-step-2').addEventListener('click', () => goToStep(2));
  document.getElementById('btn-back-to-step-3').addEventListener('click', () => goToStep(3));

  // Navegación de semana en el Slider
  document.getElementById('btn-calendar-next').addEventListener('click', () => {
    const lastDate = availableDates[availableDates.length - 1];
    const newStartDate = new Date(lastDate);
    newStartDate.setDate(lastDate.getDate() + 1);
    shiftSliderDates(newStartDate);
  });

  document.getElementById('btn-calendar-prev').addEventListener('click', () => {
    const firstDate = availableDates[0];
    const newStartDate = new Date(firstDate);
    newStartDate.setDate(firstDate.getDate() - 7);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    if (newStartDate < today) {
      shiftSliderDates(today);
    } else {
      shiftSliderDates(newStartDate);
    }
  });

  // Submit del formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (validateStep4()) {
      formData.notes = document.getElementById('input-notes').value.trim();
      await submitAppointment();
    }
  });

  // Eventos de sugerencias de horarios personalizados por parte del cliente
  const toggleBtn = document.getElementById('btn-toggle-custom-suggestion');
  const customFields = document.getElementById('custom-suggestion-fields');
  if (toggleBtn && customFields) {
    toggleBtn.addEventListener('click', () => {
      customFields.classList.toggle('hidden');
      if (!customFields.classList.contains('hidden')) {
        toggleBtn.textContent = 'Ocultar sugerencia personalizada';
      } else {
        toggleBtn.textContent = '¿Ninguno de estos horarios te acomoda? Sugiere tu fecha y hora preferida';
      }
    });
  }

  const applyBtn = document.getElementById('btn-apply-custom-suggestion');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const dateVal = document.getElementById('input-custom-date').value;
      const timeVal = document.getElementById('input-custom-time').value;
      const errorSlot = document.getElementById('error-slot-selection');
      
      if (!dateVal || !timeVal) {
        errorSlot.textContent = 'Por favor selecciona fecha y hora sugerida';
        return;
      }
      
      // Deseleccionar slider y grid estándar
      document.querySelectorAll('.date-slide-btn').forEach(b => b.classList.remove('selected'));
      document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
      document.getElementById('nearest-slot-banner').classList.add('hidden');
      errorSlot.textContent = '';
      
      formData.selectedDate = dateVal;
      formData.selectedTime = timeVal;
      document.getElementById('input-selected-date').value = dateVal;
      document.getElementById('input-selected-time').value = timeVal;
      isCustomSuggestion = true;
      
      const dateObj = parseYYYYMMDD(dateVal);
      const formattedLong = dateObj.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
      document.getElementById('display-selected-date-long').textContent = `Sugerido: ${formattedLong}`;
      
      alert(`Fecha y hora sugerida aplicada: ${formattedLong} a las ${formatTimeTo12h(timeVal)}. Puedes continuar.`);
      document.querySelector('#step-panel-2 .step-footer').scrollIntoView({ behavior: 'smooth', block: 'end' });
      
      if (window.refreshCursorHovers) window.refreshCursorHovers();
    });
  }

  // Reset del formulario (Éxito -> Paso 1)
  document.getElementById('btn-restart-form').addEventListener('click', () => {
    isCustomSuggestion = false;
    form.reset();
    formData.firstName = '';
    formData.lastName = '';
    formData.selectedDate = '';
    formData.selectedTime = '';
    formData.email = '';
    formData.phone = '';
    formData.notes = '';
    
    generateDateSlider();
    goToStep(1);
    
    document.querySelectorAll('.step-indicator').forEach((ind, idx) => {
      ind.classList.remove('completed');
      if (idx === 0) ind.classList.add('active');
      else ind.classList.remove('active');
    });
  });
}

function shiftSliderDates(startDate) {
  const datesContainer = document.getElementById('dates-slider-wrapper');
  datesContainer.innerHTML = '';
  availableDates = [];
  
  let daysAdded = 0;
  let offset = 0;

  while (daysAdded < 5) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + offset);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      availableDates.push(d);
      daysAdded++;
    }
    offset++;
  }

  availableDates.forEach((date, index) => {
    const dateStr = formatDateToYYYYMMDD(date);
    const dayName = date.toLocaleDateString('es-CL', { weekday: 'short' }).replace('.', '');
    const dayNum = date.getDate();
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `date-slide-btn ${index === 0 ? 'selected' : ''}`;
    btn.dataset.date = dateStr;
    btn.innerHTML = `
      <span class="date-slide-dayname">${dayName}</span>
      <span class="date-slide-daynum">${dayNum}</span>
    `;
    
    btn.addEventListener('click', () => {
      document.querySelectorAll('.date-slide-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectDate(dateStr);
    });
    
    datesContainer.appendChild(btn);
  });

  updateMonthDisplay(availableDates[0]);
  selectDate(formatDateToYYYYMMDD(availableDates[0]));
}

function goToStep(step) {
  Object.values(panels).forEach(panel => {
    panel.classList.remove('active');
  });

  panels[step].classList.add('active');
  currentStep = typeof step === 'number' ? step : 5;

  const progressBar = document.getElementById('progress-bar-fill');
  const stepIndicators = document.querySelectorAll('.step-indicator');
  const progressWrapper = document.getElementById('step-progress-wrapper');

  if (currentStep === 5) {
    progressWrapper.style.display = 'none';
  } else {
    progressWrapper.style.display = 'block';
    const percentage = ((currentStep - 1) / 3) * 100 + 12.5;
    progressBar.style.width = `${Math.min(percentage, 100)}%`;

    stepIndicators.forEach((ind, index) => {
      const stepNum = index + 1;
      ind.classList.remove('active', 'completed');
      if (stepNum === currentStep) {
        ind.classList.add('active');
      } else if (stepNum < currentStep) {
        ind.classList.add('completed');
      }
    });
  }

  // Scroll suave al inicio de la tarjeta de contacto
  document.getElementById('booking-widget').scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  if (window.refreshCursorHovers) window.refreshCursorHovers();
}

// ==========================================================================
// VALIDACIONES POR PASO
// ==========================================================================
function validateStep1() {
  const firstNameInput = document.getElementById('input-firstname');
  const lastNameInput = document.getElementById('input-lastname');
  const errorFirstname = document.getElementById('error-firstname');
  const errorLastname = document.getElementById('error-lastname');
  let valid = true;

  if (firstNameInput.value.trim() === '') {
    errorFirstname.textContent = 'El nombre es obligatorio';
    firstNameInput.style.borderColor = 'var(--color-danger)';
    valid = false;
  } else {
    errorFirstname.textContent = '';
    firstNameInput.style.borderColor = '';
  }

  if (lastNameInput.value.trim() === '') {
    errorLastname.textContent = 'El apellido es obligatorio';
    lastNameInput.style.borderColor = 'var(--color-danger)';
    valid = false;
  } else {
    errorLastname.textContent = '';
    lastNameInput.style.borderColor = '';
  }

  return valid;
}

function validateStep2() {
  const selectedDate = document.getElementById('input-selected-date').value;
  const selectedTime = document.getElementById('input-selected-time').value;
  const errorSlot = document.getElementById('error-slot-selection');

  if (!selectedDate || !selectedTime) {
    errorSlot.textContent = 'Debes seleccionar un horario para continuar';
    return false;
  }
  errorSlot.textContent = '';
  return true;
}

function validateStep3() {
  const emailInput = document.getElementById('input-email');
  const phoneInput = document.getElementById('input-phone');
  const errorEmail = document.getElementById('error-email');
  const errorPhone = document.getElementById('error-phone');
  let valid = true;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailInput.value.trim() === '') {
    errorEmail.textContent = 'El correo electrónico es obligatorio';
    emailInput.style.borderColor = 'var(--color-danger)';
    valid = false;
  } else if (!emailRegex.test(emailInput.value.trim())) {
    errorEmail.textContent = 'Ingresa un correo electrónico válido';
    emailInput.style.borderColor = 'var(--color-danger)';
    valid = false;
  } else {
    errorEmail.textContent = '';
    emailInput.style.borderColor = '';
  }

  const rawPhone = phoneInput.value.replace(/\s+/g, '');
  const phoneRegex = /^[9]\d{8}$/; // Celulares chilenos de 9 dígitos
  if (phoneInput.value.trim() === '') {
    errorPhone.textContent = 'El número de celular es obligatorio';
    phoneInput.style.borderColor = 'var(--color-danger)';
    valid = false;
  } else if (!phoneRegex.test(rawPhone)) {
    errorPhone.textContent = 'Ingresa un celular de 9 dígitos válido (Ej: 9 1234 5678)';
    phoneInput.style.borderColor = 'var(--color-danger)';
    valid = false;
  } else {
    errorPhone.textContent = '';
    phoneInput.style.borderColor = '';
  }

  return valid;
}

function validateStep4() {
  const notesInput = document.getElementById('input-notes');
  const errorNotes = document.getElementById('error-notes');

  if (notesInput.value.trim() === '') {
    errorNotes.textContent = 'Cuéntanos un poco sobre tus necesidades';
    notesInput.style.borderColor = 'var(--color-danger)';
    return false;
  }
  errorNotes.textContent = '';
  notesInput.style.borderColor = '';
  return true;
}

// ==========================================================================
// ENVÍO DE CITA AL SERVIDOR
// ==========================================================================
async function submitAppointment() {
  const btnSubmit = document.getElementById('btn-submit-booking');
  const spinner = document.getElementById('submit-spinner');
  
  btnSubmit.disabled = true;
  spinner.classList.remove('hidden');

  const payload = {
    worker: workerId,
    service: serviceId,
    date: formData.selectedDate,
    startTime: formData.selectedTime,
    notes: formData.notes,
    isSuggestion: isCustomSuggestion,
    clientInfo: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: `+56${formData.phone.replace(/\s+/g, '')}`
    }
  };

  try {
    const res = await fetch(`${API_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-business-slug': BUSINESS_SLUG
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Error al reservar la cita');
    }

    console.log("Cita agendada correctamente en la API:", data.payload);
    
    document.getElementById('display-success-name').textContent = formData.firstName;
    
    // Personalizar textos según si fue sugerencia
    const successHeaderP = document.querySelector('#step-panel-success .success-header p');
    const successHeaderH3 = document.querySelector('#step-panel-success .success-header h3');
    
    if (isCustomSuggestion) {
      if (successHeaderP) successHeaderP.textContent = 'Hemos enviado tu propuesta de horario. El consultor la confirmará, reagendará o cancelará a la brevedad.';
      if (successHeaderH3) successHeaderH3.innerHTML = `¡Propuesta enviada con éxito, <span id="display-success-name">${formData.firstName}</span>!`;
    } else {
      if (successHeaderP) successHeaderP.textContent = 'Hemos bloqueado el horario y reservado tu espacio en nuestra agenda.';
      if (successHeaderH3) successHeaderH3.innerHTML = `¡Reunión agendada con éxito, <span id="display-success-name">${formData.firstName}</span>!`;
    }

    const dateObj = parseYYYYMMDD(formData.selectedDate);
    const dayLong = dateObj.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('success-date-time').textContent = `${dayLong}, ${formatTimeTo12h(formData.selectedTime)} ${isCustomSuggestion ? '(Propuesto)' : ''}`;
    document.getElementById('success-contact-info').textContent = formData.email;

    goToStep('success');
  } catch (error) {
    console.error("Error al registrar la cita:", error);
    alert(`Ocurrió un error al agendar tu cita: ${error.message}. Por favor intenta nuevamente.`);
  } finally {
    btnSubmit.disabled = false;
    spinner.classList.add('hidden');
  }
}

// ==========================================================================
// AUXILIARES
// ==========================================================================
function formatDateToYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseYYYYMMDD(str) {
  const parts = str.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

function formatTimeTo12h(time24) {
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
}

// Iniciar aplicación al cargar
window.addEventListener('DOMContentLoaded', init);
