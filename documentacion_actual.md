# Documentación de Funcionalidades: Estado Actual de IngridJEN

Este documento detalla todas las funcionalidades, reglas de negocio y arquitecturas implementadas actualmente en la aplicación **IngridJEN**, asegurando que sirva como fuente de verdad para el estado de la plataforma hasta la fecha.

---

## 🏗️ Arquitectura General y Backend

La aplicación ha sido migrada completamente de un estado local a un backend profesional alojado en **Firebase (Google Cloud)**.

### Características del Backend:
1. **Sincronización en Tiempo Real (`InstitutionContext.tsx`)**: 
   - Utiliza conexiones `onSnapshot` de Firestore. Cualquier cambio (crear estudiante, registrar pago, etc.) se refleja **instantáneamente** en todos los dispositivos conectados sin necesidad de recargar la aplicación.
2. **Persistencia y Modo Offline**:
   - Los datos están respaldados en la nube. Si el dispositivo pierde conexión, Firebase guarda en caché las operaciones locales y las sincroniza automáticamente al recuperar la red.
3. **Escalabilidad**:
   - Bases de datos organizadas en colecciones claras: `academicCycles`, `courses`, `students`, `teachers`, `classes`, `enrollments`, `installments`, y `payments`.

---

## 🔒 Reglas de Negocio y Salvaguardas ("Safeguards")

Para garantizar la integridad de los datos, la aplicación cuenta con bloqueos estrictos de eliminación:
*   **Estudiantes**: No se pueden eliminar si tienen historial de matrículas.
*   **Profesores**: No se pueden eliminar si están asignados a alguna clase activa. Tampoco se pueden "Inhabilitar" si tienen clases en curso en el ciclo actual.
*   **Clases**: No se pueden eliminar si tienen estudiantes matriculados.
*   **Ciclos Académicos**: No se pueden eliminar si existen clases vinculadas a ellos.

### Validaciones Visuales (UX)
Todos los formularios de creación/edición reemplazan las molestas alertas de error por **retroalimentación visual en tiempo real**. Los campos requeridos vacíos se marcan con bordes rojos, y mensajes de ayuda aparecen directamente debajo de los campos afectados (ej. "El nombre es obligatorio").

---

## 📱 Módulos y Funcionalidades por Pantalla

### 1. Gestión de Ciclos Académicos (`/cycles`)
*   **Creación y Edición**: Permite definir ciclos (Ej. "Verano 2026", "Anual 2026") con una **Fecha de Inicio** y **Fecha de Fin** exactas mediante un selector de calendario (`DateTimePicker`).
*   **Gestión de Descuentos (Eventos)**: Permite registrar semanas no laborables o eventos especiales. El sistema calcula automáticamente en qué mes cae la mayoría de los días del evento y aplica un porcentaje de descuento a la mensualidad de ese mes.
*   **Restricciones**: No permite ciclos con nombres duplicados.

### 2. Gestión de Cursos (`/courses`)
*   **Definición Base**: Se configuran los cursos (materias) estándar con su nombre, **duración predeterminada** (horas y minutos) y **precio mensual base**.

### 3. Gestión de Personal y Alumnado (`/teachers` y `/students`)
Utilizan un componente unificado (`ManagementModule.tsx`).
*   **Ficha Completa**: Nombres, Apellidos, Teléfono, y Estado ("Activo" / "Inactivo"). Profesores pueden tener una especialidad opcional.
*   **Manejo de Años Activos (Estudiantes)**: Cuando un estudiante se marca como "Activo", se le debe asignar su **Año Activo**. Esto asegura que solo los estudiantes cuyo año activo coincida con el año del ciclo seleccionado puedan ser matriculados en sus clases.

### 4. Gestión de Clases (`/classes`)
El módulo más complejo, actúa como el puente que une todos los demás módulos.
*   **Selector Global de Periodo**: Un encabezado (`PeriodHeader`) permite cambiar el ciclo activo en cualquier momento, filtrando instantáneamente la vista.
*   **Creación de Instancias (Clases)**: Se escoge un Curso base, un Profesor, un color identificativo, un **Aforo Máximo**, y se definen los **Horarios** (días de la semana y hora de inicio). La hora de fin se calcula sola.
*   **Validación de Cruce de Horarios**: El sistema bloquea guardados si detecta que el profesor ya tiene otra clase en ese mismo horario y día.
*   **Vistas Duales**: Permite ver las clases como una **Lista** de tarjetas arrastrables (drag-to-delete) o en un **Horario** organizado en columnas por los días de la semana.
```markdown
*   **Matrícula Inteligente**: 
    *   Modal para matricular estudiantes en la clase.
    *   **Control de Aforo Estricto**: El sistema impide manualmente exceder el límite de alumnos definido para la clase.
    *   **Flujo de Importación y Validación**: 
        *   Permite superar el aforo mediante la herramienta de **Importación Masiva**. Tras la carga, el sistema habilita un estado de revisión con dos acciones críticas:
        *   **Confirmar Importación**: Valida y consolida todos los cambios realizados tras la carga masiva, haciéndolos permanentes en el sistema.
        *   **Revertir Importación**: En caso de error o equivocación, este botón invalida el proceso por completo, restaurando la clase a su estado original antes de la importación.
    *   **Gestión de Sobrecupo**: Si una importación confirmada excede el límite, el marcador de aforo cambia a color rojo. Los estudiantes en estado de sobrecupo disponen de un botón de transferencia rápida para ser **movidos** a otra clase; este proceso preserva su **fecha de matrícula original**, garantizando que el historial de cobros y mensualidades no se vea afectado.
```

### 5. Control de Pagos y Mensualidades (`/fees`)
*   **Generación Automática de Deudas**: Al matricular a un estudiante en una clase, el sistema lee la Fecha de Inicio y Fin del ciclo, y el día en que el estudiante se matriculó por primera vez, para **generar automáticamente las cuotas (Installments)** mes a mes.
*   **Integración de Descuentos**: Si el mes de la cuota coincide con un `EventDiscount` registrado en el ciclo académico, la cuota base del curso se recalcula automáticamente marcando la nota del descuento aplicado.
*   **Interfaz de Cobranza**:
    *   Filtro por año y mes.
    *   Lista de deudores agrupada por estudiante. Indican color verde (pagado) o rojo/naranja (pendiente).
    *   Registro rápido de transacciones. Una vez confirmada, se crea un registro inmutable en la colección `payments` como comprobante de pago.
