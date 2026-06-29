// landing-cursos.js - Lógica del calendario y temario dinámico de cursos (Con multi-selección y cruces)

document.addEventListener('DOMContentLoaded', () => {
    // Configuración de Colores de Cursos
    const COURSE_COLORS = {
        '5': 'course-excel',       // EXCEL FOR DATA ANALYST (Purple)
        '3': 'course-pbi',         // POWER BI BASICO-INTERMEDIO (Yellow)
        '1': 'course-sql-basic',   // SQL BASICO-INTERMEDIO (Green)
        '2': 'course-sql-adv',     // SQL INTERMEDIO-AVANZADO (Teal)
        '6': 'course-python'       // PYTHON FOR DATA ANALYST (Blue)
    };

    // Configuración de Logos de Tecnologías
    const COURSE_LOGOS = {
        '5': 'assets/img/formation/3Excel.png',
        '3': 'assets/img/formation/4Powerbi.png',
        '1': 'assets/img/formation/sql.png',
        '2': 'assets/img/formation/sql.png',
        '6': 'assets/img/formation/5Python.png'
    };

    let coursesData = [];
    let syllabusData = [];
    let computedCourses = [];
    let activeCourseIds = ['5', '3', '1', '2', '6']; // Todos seleccionados por defecto al inicio
    let conflictsList = [];

    // Inicializar carga
    loadData();

    // =========================================
    // Carga de Datos desde CSV
    // =========================================
    async function loadData() {
        try {
            const [coursesRes, syllabusRes] = await Promise.all([
                fetch('assets/data/cursos.csv').then(res => res.text()),
                fetch('assets/data/temario.csv').then(res => res.text())
            ]);

            coursesData = parseCSV(coursesRes);
            syllabusData = parseCSV(syllabusRes);

            // Calcular fechas de clases para cada curso
            computedCourses = coursesData.map(course => {
                const startDate = parseDateStr(course['INICIO']);
                const targetDays = getTargetDaysOfWeek(course['DIAS']);
                const classDates = calculateClassDates(startDate, targetDays, 8);
                const colorClass = COURSE_COLORS[course['N°']] || 'course-default';
                
                return {
                    course,
                    dates: classDates,
                    colorClass
                };
            });

            // Registrar controladores de los botones globales de selección
            setupGlobalSelectors();

            // Inicializar vistas
            renderSelectors();
            updateDashboard();
            setupThemeToggle();

        } catch (error) {
            console.error('Error cargando los datos de los cursos:', error);
            const container = document.querySelector('.calendar-card');
            if (container) {
                container.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#ff5f56;">
                        <i class="fas fa-exclamation-triangle" style="font-size:3rem; margin-bottom:15px;"></i>
                        <h3>Error al cargar el Calendario Académico</h3>
                        <p>No pudimos leer los archivos de datos CSV. Por favor verifica que se encuentren en la ruta correcta.</p>
                    </div>
                `;
            }
        }
    }

    // =========================================
    // Controladores de Selector Global
    // =========================================
    function setupGlobalSelectors() {
        const btnSelectAll = document.getElementById('btn-select-all');
        const btnClearSelection = document.getElementById('btn-clear-selection');

        if (btnSelectAll) {
            btnSelectAll.addEventListener('click', () => {
                activeCourseIds = computedCourses.map(cc => cc.course['N°']);
                renderSelectors();
                updateDashboard();
            });
        }

        if (btnClearSelection) {
            btnClearSelection.addEventListener('click', () => {
                activeCourseIds = [];
                renderSelectors();
                updateDashboard();
            });
        }

        // Acciones para los botones de combos más vendidos
        const btnComboAnalista = document.getElementById('btn-combo-analista');
        const btnComboEngineer = document.getElementById('btn-combo-engineer');

        if (btnComboAnalista) {
            btnComboAnalista.addEventListener('click', () => {
                activeCourseIds = ['5', '1', '6'];
                renderSelectors();
                updateDashboard();
            });
        }

        if (btnComboEngineer) {
            btnComboEngineer.addEventListener('click', () => {
                activeCourseIds = ['3', '2', '6'];
                renderSelectors();
                updateDashboard();
            });
        }
    }

    // =========================================
    // Parser de CSV
    // =========================================
    function parseCSV(text) {
        let lines = [];
        let row = [""];
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            let c = text[i];
            let next = text[i+1];

            if (c === '"') {
                if (inQuotes && next === '"') {
                    row[row.length - 1] += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === ',' && !inQuotes) {
                row.push("");
            } else if ((c === '\r' || c === '\n') && !inQuotes) {
                if (c === '\r' && next === '\n') {
                    i++;
                }
                lines.push(row);
                row = [""];
            } else {
                row[row.length - 1] += c;
            }
        }
        if (row.length > 1 || row[0] !== "") {
            lines.push(row);
        }

        // Mapear cabeceras a objetos
        if (lines.length === 0) return [];
        const headers = lines[0].map(h => h.trim().replace(/^﻿/, "")); // Limpiar BOM
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i];
            if (values.length < headers.length || (values.length === 1 && values[0] === "")) continue;
            
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                let val = values[j] ? values[j].trim() : "";
                obj[headers[j]] = val;
            }
            result.push(obj);
        }
        return result;
    }

    // =========================================
    // Manejo de Fechas y Calendario
    // =========================================
    function parseDateStr(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return new Date();
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
    }

    function getTargetDaysOfWeek(daysStr) {
        const normalized = daysStr.toUpperCase();
        const targetDays = [];
        if (normalized.includes("LUNES")) targetDays.push(1);
        if (normalized.includes("MARTES")) targetDays.push(2);
        if (normalized.includes("MIERCOLES")) targetDays.push(3);
        if (normalized.includes("JUEVES")) targetDays.push(4);
        if (normalized.includes("VIERNES")) targetDays.push(5);
        if (normalized.includes("SABADO")) targetDays.push(6);
        if (normalized.includes("DOMINGO")) targetDays.push(0);
        return targetDays;
    }

    function calculateClassDates(startDate, targetDays, numClasses = 8) {
        const dates = [];
        let currentDate = new Date(startDate.getTime());
        let safetyCounter = 0;
        
        while (dates.length < numClasses && safetyCounter < 100) {
            safetyCounter++;
            const dayOfWeek = currentDate.getDay();
            if (targetDays.includes(dayOfWeek)) {
                dates.push(new Date(currentDate.getTime()));
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dates;
    }

    function getTopicForCourse(courseName, classNum) {
        const normalizedCourse = courseName.toUpperCase().trim();
        const found = syllabusData.find(item => 
            item['CURSO'].toUpperCase().trim() === normalizedCourse && 
            parseInt(item['CLASE_NUM'], 10) === classNum
        );
        
        return found ? found : { TEMA: `Sesión ${classNum}`, DESCRIPCION: 'Detalle de la clase en desarrollo.' };
    }

    // =========================================
    // Renderizado de UI
    // =========================================
    function renderSelectors() {
        const selectorContainer = document.getElementById('course-selector-tabs');
        if (!selectorContainer) return;

        selectorContainer.innerHTML = '';

        // Botón: Calendario Master (Activa todos)
        const allBtn = document.createElement('button');
        const allActive = activeCourseIds.length === computedCourses.length && computedCourses.length > 0;
        allBtn.className = `tab-btn ${allActive ? 'active' : ''}`;
        allBtn.innerHTML = `<i class="fas fa-calendar-alt"></i> Calendario Master`;
        allBtn.addEventListener('click', () => {
            if (allActive) {
                activeCourseIds = [];
            } else {
                activeCourseIds = computedCourses.map(cc => cc.course['N°']);
            }
            renderSelectors();
            updateDashboard();
        });
        selectorContainer.appendChild(allBtn);

        // Botones individuales por curso (con toggles independientes)
        computedCourses.forEach(cc => {
            const btn = document.createElement('button');
            const isActive = activeCourseIds.includes(cc.course['N°']);
            
            btn.className = `tab-btn border-${cc.colorClass} ${isActive ? 'active' : ''}`;
            btn.setAttribute('data-course-id', cc.course['N°']);
            
            // Icono de checkbox e indicador de logo
            const checkIcon = isActive ? 'fa-check-square' : 'fa-square';
            const logoUrl = COURSE_LOGOS[cc.course['N°']] || '';
            btn.innerHTML = `
                <i class="far ${checkIcon} check-icon" style="display:inline-block;"></i>
                <img src="${logoUrl}" class="tech-logo-indicator" alt="${cc.course['CURSO']}">
                ${cc.course['CURSO']}
            `;
            
            btn.addEventListener('click', () => {
                toggleCourse(cc.course['N°']);
            });
            selectorContainer.appendChild(btn);
        });
    }

    function toggleCourse(courseId) {
        const index = activeCourseIds.indexOf(courseId);
        if (index > -1) {
            activeCourseIds.splice(index, 1); // Quitar si ya estaba seleccionado
        } else {
            activeCourseIds.push(courseId); // Añadir si no estaba
        }
        
        renderSelectors();
        updateDashboard();
    }

    function detectConflicts(year, month) {
        conflictsList = [];
        const dateConflicts = {}; // Map de d -> lista de clases

        // Recorrer todos los cursos seleccionados
        computedCourses.forEach(cc => {
            if (!activeCourseIds.includes(cc.course['N°'])) return;

            cc.dates.forEach((date, index) => {
                if (date.getMonth() === month && date.getFullYear() === year) {
                    const day = date.getDate();
                    if (!dateConflicts[day]) {
                        dateConflicts[day] = [];
                    }
                    dateConflicts[day].push({
                        course: cc.course,
                        classNum: index + 1,
                        colorClass: cc.colorClass
                    });
                }
            });
        });

        // Identificar los días con 2 o más clases activas simultáneas
        for (const day in dateConflicts) {
            if (dateConflicts[day].length >= 2) {
                // Hay un cruce en este día
                const dayNum = parseInt(day, 10);
                const dateObj = new Date(year, month, dayNum);
                
                const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
                const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                
                const formattedDate = `${capitalizedDay} ${dayNum} de agosto`;
                const coursesNames = dateConflicts[day].map(c => `<strong>${c.course['CURSO']}</strong> (Clase ${c.classNum})`).join(' y ');

                conflictsList.push({
                    day: dayNum,
                    dateStr: formattedDate,
                    courses: dateConflicts[day],
                    description: `${formattedDate}: Cruce entre ${coursesNames} a las ${dateConflicts[day][0].course['HORARIO']}`
                });
            }
        }

        // Ordenar conflictos por día
        conflictsList.sort((a, b) => a.day - b.day);
    }

    function updateDashboard() {
        // Detectar cruces antes de pintar el calendario
        detectConflicts(2026, 7);

        // Pintar alertas de cruces
        renderConflictAlerts();

        // Renderizar Calendario para Agosto 2026 (Mes 7)
        renderCalendarGrid(2026, 7);

        // Actualizar vistas informativas
        const infoSection = document.getElementById('course-info-card');
        const syllabusSection = document.getElementById('course-syllabus-section');
        const placeholderSection = document.getElementById('master-info-placeholder');

        if (activeCourseIds.length === 1) {
            // Mostrar Vista Curso Individual cuando exactamente UN curso está seleccionado
            if (infoSection) infoSection.style.display = 'grid';
            if (syllabusSection) syllabusSection.style.display = 'block';
            if (placeholderSection) placeholderSection.style.display = 'none';

            const activeCC = computedCourses.find(cc => cc.course['N°'] === activeCourseIds[0]);
            if (activeCC) {
                renderCourseDetails(activeCC);
                renderCourseSyllabus(activeCC);
            }
        } else {
            // Mostrar Vista Resumen para selecciones múltiples o vacías
            if (infoSection) infoSection.style.display = 'none';
            if (syllabusSection) syllabusSection.style.display = 'none';
            if (placeholderSection) placeholderSection.style.display = 'block';
            
            renderMasterCoursesTable();
        }

        // Mostrar u ocultar el botón de Matrícula de WhatsApp para selección múltiple
        const masterCtaContainer = document.getElementById('master-whatsapp-cta-container');
        const masterCtaBtn = document.getElementById('master-whatsapp-cta');
        if (masterCtaContainer && masterCtaBtn) {
            if (activeCourseIds.length >= 2) {
                masterCtaContainer.style.display = 'block';
                
                // Obtener nombres de los cursos seleccionados
                const selectedCourses = computedCourses.filter(cc => activeCourseIds.includes(cc.course['N°']));
                const courseNamesList = selectedCourses.map(cc => `* ${cc.course['CURSO']}`).join('\n');
                
                const messageText = `Hola, estoy interesado en matricularme en los siguientes cursos de la 4ta edición:\n${courseNamesList}`;
                masterCtaBtn.href = `https://api.whatsapp.com/send/?phone=51904882577&text=${encodeURIComponent(messageText)}&type=phone_number&app_absent=0`;
            } else {
                masterCtaContainer.style.display = 'none';
            }
        }
    }

    function renderConflictAlerts() {
        const alertBox = document.getElementById('cruce-alert-box');
        const coursesList = document.getElementById('cruce-alert-courses-list');

        if (!alertBox || !coursesList) return;

        if (conflictsList.length > 0) {
            alertBox.style.display = 'flex';
            
            // Obtener combinaciones únicas de cursos que se cruzan
            const seenPairs = new Set();
            const uniqueConflicts = [];
            
            conflictsList.forEach(c => {
                const activeCourses = c.courses.map(item => item.course['CURSO']);
                activeCourses.sort();
                const pairStr = activeCourses.join(' y ');
                if (!seenPairs.has(pairStr)) {
                    seenPairs.add(pairStr);
                    uniqueConflicts.push(pairStr);
                }
            });

            coursesList.innerHTML = uniqueConflicts.map(pair => `
                <div style="margin-bottom: 4px;"><i class="fas fa-exclamation-triangle" style="margin-right: 6px;"></i> Entre <strong>${pair}</strong></div>
            `).join('');
        } else {
            alertBox.style.display = 'none';
        }
    }

    function renderCalendarGrid(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const numDays = lastDay.getDate();

        let startDayIndex = firstDay.getDay() - 1;
        if (startDayIndex < 0) {
            // El domingo se omite, por lo que el mes empieza en lunes (índice 0)
            startDayIndex = 0;
        } 

        const calendarGrid = document.getElementById('calendar-grid');
        if (!calendarGrid) return;
        
        calendarGrid.innerHTML = '';

        // Rellenar vacíos
        for (let i = 0; i < startDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyCell);
        }

        // Renderizar cada día del mes (excluyendo domingos)
        for (let d = 1; d <= numDays; d++) {
            const currentDayDate = new Date(year, month, d);
            if (currentDayDate.getDay() === 0) {
                continue; // Saltar los domingos
            }

            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';

            // Calcular el índice de la columna en el grid de 6 días (Lunes=0, Sábado=5)
            const colIndex = currentDayDate.getDay() - 1;
            if (colIndex === 0 || colIndex === 1) {
                dayCell.classList.add('tooltip-left');
            } else if (colIndex === 4 || colIndex === 5) {
                dayCell.classList.add('tooltip-right');
            }

            const dateNumSpan = document.createElement('span');
            dateNumSpan.className = 'day-number';
            dateNumSpan.textContent = d;
            dayCell.appendChild(dateNumSpan);

            // Verificar si este día específico tiene un cruce detectado
            const isConflictDay = conflictsList.some(c => c.day === d);

            // Buscar clases programadas para este día de entre los seleccionados
            const classesToday = [];
            computedCourses.forEach(cc => {
                if (!activeCourseIds.includes(cc.course['N°'])) return;

                const classIndex = cc.dates.findIndex(date => 
                    date.getDate() === d && date.getMonth() === month && date.getFullYear() === year
                );

                if (classIndex !== -1) {
                    classesToday.push({
                        course: cc.course,
                        classNum: classIndex + 1,
                        colorClass: cc.colorClass,
                        topic: getTopicForCourse(cc.course['CURSO'], classIndex + 1)
                    });
                }
            });

            if (classesToday.length > 0) {
                dayCell.classList.add('has-class');

                if (isConflictDay) {
                    // CÉLULA EN AMARILLO DE CRUCE DE HORARIOS
                    dayCell.classList.add('cruce-conflict');

                    const badge = document.createElement('span');
                    badge.className = 'class-badge';
                    badge.innerHTML = `<span class="desktop-text"><i class="fas fa-exclamation-triangle"></i> Cruce</span><span class="mobile-text" style="display:none;"><i class="fas fa-exclamation-triangle"></i></span>`;
                    dayCell.appendChild(badge);

                    // Tooltip de Cruces
                    let tooltipContent = `<div class="tooltip-header" style="color:#ffe082;"><i class="fas fa-exclamation-circle"></i> Cruce de Horario</div><div class="tooltip-body">`;
                    classesToday.forEach(c => {
                        tooltipContent += `
                            <div class="multi-tooltip-row">
                                <span class="bullet-${c.colorClass}">●</span>
                                <strong>${c.course['CURSO']}:</strong> Clase ${c.classNum}<br>
                                <span class="tooltip-desc">${c.topic.TEMA}</span>
                            </div>
                        `;
                    });
                    tooltipContent += `<div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px;"><i class="far fa-clock"></i> Hora: ${classesToday[0].course['HORARIO']}</div></div>`;

                    const tooltip = document.createElement('div');
                    tooltip.className = 'calendar-tooltip';
                    tooltip.innerHTML = tooltipContent;
                    dayCell.appendChild(tooltip);

                } else if (classesToday.length === 1) {
                    // Una sola clase sin conflictos
                    const c = classesToday[0];
                    dayCell.classList.add(c.colorClass);

                    const badge = document.createElement('span');
                    badge.className = 'class-badge';
                    badge.innerHTML = `<span class="desktop-text">Sesión ${c.classNum}</span><span class="mobile-text" style="display:none;">S${c.classNum}</span>`;
                    dayCell.appendChild(badge);

                    const tooltip = document.createElement('div');
                    tooltip.className = 'calendar-tooltip';
                    tooltip.innerHTML = `
                        <div class="tooltip-header font-${c.colorClass}">${c.course['CURSO']}</div>
                        <div class="tooltip-body">
                            <strong>Clase ${c.classNum}:</strong> ${c.topic.TEMA}<br>
                            <span class="tooltip-desc">${c.topic.DESCRIPCION}</span><br>
                            <i class="far fa-clock"></i> ${c.course['HORARIO']}
                        </div>
                    `;
                    dayCell.appendChild(tooltip);

                } else {
                    // Múltiples clases en un mismo día pero no configurado como conflicto (salvaguarda)
                    dayCell.classList.add('multiple-classes');

                    const dotsWrapper = document.createElement('div');
                    dotsWrapper.className = 'multi-class-indicators';
                    
                    let tooltipContent = `<div class="tooltip-header">Clases de Hoy</div><div class="tooltip-body">`;
                    classesToday.forEach(c => {
                        const img = document.createElement('img');
                        img.src = COURSE_LOGOS[c.course['N°']] || '';
                        img.className = 'tech-logo-indicator';
                        img.alt = c.course['CURSO'];
                        img.style.margin = '0 1px';
                        dotsWrapper.appendChild(img);

                        tooltipContent += `
                            <div class="multi-tooltip-row">
                                <span class="bullet-${c.colorClass}">●</span>
                                <strong>${c.course['CURSO']} (Sesión ${c.classNum}):</strong><br>
                                ${c.topic.TEMA}
                            </div>
                        `;
                    });
                    tooltipContent += `</div>`;
                    dayCell.appendChild(dotsWrapper);

                    const tooltip = document.createElement('div');
                    tooltip.className = 'calendar-tooltip';
                    tooltip.innerHTML = tooltipContent;
                    dayCell.appendChild(tooltip);
                }
            }

            calendarGrid.appendChild(dayCell);
        }
    }

    function renderCourseDetails(cc) {
        document.getElementById('info-course-name').textContent = cc.course['CURSO'];
        document.getElementById('info-classroom-name').textContent = cc.course['NOMBRE CLASSROOM'];
        
        const copyFlyerContainer = document.getElementById('info-copy-flyer');
        if (copyFlyerContainer) {
            const lines = cc.course['Copy flyer'].split('\n');
            copyFlyerContainer.innerHTML = lines.map(line => {
                if (line.trim().startsWith('*')) {
                    return `<li><i class="fas fa-check-circle text-accent"></i> ${line.replace('*', '').trim()}</li>`;
                }
                return `<p>${line}</p>`;
            }).join('');
        }

        document.getElementById('info-horario').textContent = cc.course['HORARIO'];
        document.getElementById('info-dias').textContent = cc.course['DIAS'];
        document.getElementById('info-inicio').textContent = cc.course['INICIO'];
        
        const ctaBtn = document.getElementById('info-whatsapp-cta');
        if (ctaBtn) {
            const msg = encodeURIComponent(`Hola, estoy interesado en matricularme en el curso *${cc.course['CURSO']}* de la *${cc.course['EDICION']}ta edición*.`);
            ctaBtn.href = `https://api.whatsapp.com/send/?phone=51904882577&text=${msg}&type=phone_number&app_absent=0`;
        }
    }

    function renderCourseSyllabus(cc) {
        const container = document.getElementById('syllabus-accordion-container');
        if (!container) return;

        container.innerHTML = '';

        cc.dates.forEach((date, i) => {
            const classNum = i + 1;
            const topic = getTopicForCourse(cc.course['CURSO'], classNum);
            
            const opt = { weekday: 'long', day: 'numeric', month: 'long' };
            const formattedDate = date.toLocaleDateString('es-ES', opt);
            const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

            const accordionItem = document.createElement('div');
            accordionItem.className = 'syllabus-card';
            
            accordionItem.innerHTML = `
                <div class="syllabus-card-header">
                    <div class="class-num-bubble ${cc.colorClass}">Sesión ${classNum}</div>
                    <div class="syllabus-header-text">
                        <h4>${topic.TEMA}</h4>
                        <span class="class-date-label"><i class="far fa-calendar-alt"></i> ${capitalizedDate}</span>
                    </div>
                    <i class="fas fa-chevron-down accordion-icon"></i>
                </div>
                <div class="syllabus-card-body">
                    <p>${topic.DESCRIPCION}</p>
                    <div class="session-meta">
                        <span><i class="far fa-clock"></i> Horario: ${cc.course['HORARIO']}</span>
                    </div>
                </div>
            `;

            const header = accordionItem.querySelector('.syllabus-card-header');
            header.addEventListener('click', () => {
                const isActive = accordionItem.classList.contains('active');
                
                document.querySelectorAll('.syllabus-card').forEach(card => {
                    card.classList.remove('active');
                });

                if (!isActive) {
                    accordionItem.classList.add('active');
                }
            });

            container.appendChild(accordionItem);
        });

        const firstCard = container.querySelector('.syllabus-card');
        if (firstCard) firstCard.classList.add('active');
    }

    function renderMasterCoursesTable() {
        const tableBody = document.getElementById('master-table-body');
        const placeholderText = document.querySelector('#master-info-placeholder p');
        const placeholderTitle = document.querySelector('#master-info-placeholder h3');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        // Filtrar cursos activos para mostrarlos en la tabla resumen
        const activeCCs = computedCourses.filter(cc => activeCourseIds.includes(cc.course['N°']));

        if (activeCCs.length === 0) {
            placeholderTitle.textContent = "Sin Cursos Seleccionados";
            placeholderText.textContent = "No has seleccionado ningún curso. Haz clic en las pestañas superiores para activar al menos un curso y ver su programación.";
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">
                        <i class="fas fa-info-circle"></i> No hay cursos seleccionados para mostrar en el resumen.
                    </td>
                </tr>
            `;
            return;
        }

        placeholderTitle.textContent = "Resumen de Cursos Seleccionados";
        placeholderText.textContent = `Visualizando el cronograma integrado de los ${activeCCs.length} cursos seleccionados. Puedes ver los detalles individuales de cada uno haciendo clic en "Ver Detalles" en la tabla.`;

        activeCCs.forEach(cc => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="course-name-cell">
                        <img src="${COURSE_LOGOS[cc.course['N°']] || ''}" class="tech-logo-indicator" alt="${cc.course['CURSO']}">
                        <strong>${cc.course['CURSO']}</strong>
                    </div>
                </td>
                <td><span class="days-badge">${cc.course['DIAS']}</span></td>
                <td><i class="far fa-clock text-muted"></i> ${cc.course['HORARIO']}</td>
                <td><i class="far fa-calendar-check text-muted"></i> ${cc.course['INICIO']}</td>
                <td>
                    <button class="btn btn-sm btn-view-course" data-target-id="${cc.course['N°']}">
                        Ver Detalles <i class="fas fa-arrow-right"></i>
                    </button>
                </td>
            `;

            tr.querySelector('.btn-view-course').addEventListener('click', () => {
                // Al hacer clic, seleccionamos ÚNICAMENTE este curso para ver su syllabus individual
                activeCourseIds = [cc.course['N°']];
                renderSelectors();
                updateDashboard();
                
                // Scroll suave a los detalles del curso
                document.getElementById('calendar-card-wrapper').scrollIntoView({ behavior: 'smooth' });
            });

            tableBody.appendChild(tr);
        });
    }

    // =========================================
    // Lógica de Modo Oscuro (Dark Theme Sync)
    // =========================================
    function setupThemeToggle() {
        const themeToggleBtn = document.getElementById('theme-toggle');
        const htmlElement = document.documentElement;

        function updateToggleIcon(isDark) {
            if (themeToggleBtn) {
                const icon = themeToggleBtn.querySelector('i');
                if (icon) {
                    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
                }
            }
        }

        updateToggleIcon(htmlElement.classList.contains('dark-theme'));

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                setTimeout(() => {
                    updateToggleIcon(htmlElement.classList.contains('dark-theme'));
                }, 50);
            });
        }
    }
});
