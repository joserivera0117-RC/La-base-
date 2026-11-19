# Recaudería La Base

Sitio web para presentar la recaudería, explorar productos y preparar una lista para consultar por WhatsApp. Permite editar las cantidades de los productos agregados y muestra las formas de pago aceptadas. Está hecho con HTML, CSS y JavaScript sin dependencias complejas.

## Abrir el sitio

1. Abre esta carpeta en Visual Studio Code.
2. Abre `index.html` en tu navegador (o usa la extensión **Live Server** de VS Code y elige “Open with Live Server”).

---

## 🟢 Conexión con Google Sheets (Base de Datos en la nube)

Ahora puedes modificar tus productos, precios, fotos y disponibilidad directamente desde una hoja de Google Sheets en tu celular o computadora.

### Pasos para conectar tu Google Sheet:

1. **Preparar la hoja de productos:**
   - Usa `productos_la_base_actualizado.csv` como plantilla.
   - Si ya tienes productos propios en Google Sheets, conserva una copia y agrega o actualiza las columnas necesarias sin reemplazar la hoja completa.
   - Evita borrar las filas que ya administras; puedes incorporar las filas de la plantilla y después revisar IDs duplicados.

2. **Publicar la hoja como CSV:**
   - En tu hoja de Google Sheets, ve a **Archivo > Compartir > Publicar en la web**.
   - En el primer recuadro deja **Todo el documento** (o *Hoja 1*).
   - En el segundo recuadro cambia de *Página web* a **Valores separados por comas (.csv)**.
   - Haz clic en el botón verde **Publicar** y copia el enlace generado.

3. **Verificar el enlace de tu sitio web:**
   - Abre `app.js` y revisa `GOOGLE_SHEET_CSV_URL`, cerca del inicio del archivo.
   - El proyecto ya contiene un enlace de Google Sheets. Si usarás otra hoja, reemplázalo por el enlace de esa hoja y confirma que la hoja esté publicada o accesible como CSV.
   - La página consulta el catálogo al cargar y vuelve a sincronizarlo periódicamente. Si no puede leer la hoja, conserva el catálogo local de respaldo.

---

### Columnas de la hoja

Usa estos encabezados (el orden de la plantilla es el recomendado):

| Columna | Valores y uso |
|---|---|
| `ID` | Identificador único y permanente, por ejemplo `PROD-068`. No lo repitas ni lo cambies después: la lista del cliente se guarda usando este valor. |
| `Nombre` | Texto requerido que verá el cliente. Los cinco nombres de hierbas configurados son `Cilantro`, `Perejil`, `Hierbabuena`, `Epazote` y `Manzanilla`; el código los fuerza a venta por `Monto`. |
| `Categoria` | Texto que agrupa y filtra productos. Para mantener consistencia, usa `Frutas`, `Verduras y Legumbres`, `Chiles`, `Chiles Secos`, `Semillas y abarrotes` o `Hierbas`. Otras categorías aparecen en el filtro, pero no tienen tarjeta propia en la sección de categorías. |
| `Unidad` | Para `Peso`, usa `kg` porque el precio es por kilogramo. Para `Unidad`, la etiqueta es libre: `pieza`, `rama`, `bolsa`, `charola`, `cuarto`, `manojo` o `paquete`. Para `Pieza por kg`, usa `pieza`. Para `Monto`, usa `monto`. |
| `Tipo Venta` | Preferentemente escribe `Peso`, `Unidad`, `Monto` o `Pieza por kg`. Esta última permite pedir piezas enteras cuyo importe final depende del peso real: se muestra el precio por kilo y el total queda pendiente hasta pesarlas. El mínimo y el incremento de piezas son 1. Se aceptan también `kilogramo` como `Peso`, `dinero`/`pesos` como `Monto`, y `pieza`/`bolsa`/`paquete` como `Unidad`. En blanco, se infiere `Peso` para `kg`/`gramo(s)`, `Monto` para la unidad `monto` y `Unidad` para las demás. |
| `Precio` | Número sin texto. `Peso` y `Pieza por kg`: precio por kilogramo; `Unidad`: precio por una unidad de la etiqueta, por ejemplo una pieza o bolsa. `Monto`: déjalo vacío; la tarjeta muestra el mínimo. Para `Pieza por kg`, el total exacto no se calcula hasta conocer el peso real. |
| `Activo` | `SI` muestra el producto; `NO` lo oculta. También se aceptan `TRUE`, `VERDADERO`, `1`, `YES`, `ACTIVO` y casilla marcada/desmarcada. Si se deja vacío, se muestra. |
| `Estado` | Déjalo vacío o usa `Disponible` para el estado normal. `Agotado`, `Sin existencia` o `Terminado` desactivan la compra. Textos que contengan `Especial`, `Llegó`, `Pocas` o `Temporada` pueden aparecer en la vitrina de especiales. |
| `Destacado` | `SI` o `TRUE` activa la insignia de más vendido. Vacío/`NO` no lo activa. Algunos productos populares ya se destacan automáticamente por su nombre. |
| `Cantidad Minima` | Según `Tipo Venta`: gramos mínimos para `Peso` (por defecto 50), monto mínimo en pesos para `Monto`, o cantidad mínima para `Unidad`. `Pieza por kg` siempre comienza en 1 pieza. En el catálogo, cilantro/manzanilla usan `$5`; perejil/hierbabuena/epazote, `$2`. Al elegir monto para un producto `Peso`, el mínimo es `$10` y no se configura con esta columna. |
| `Incremento` | Según `Tipo Venta`: paso en gramos para `Peso` (por defecto 50), pesos por paso para `Monto` (por defecto $1), o cantidad por paso para `Unidad` (por defecto 1). `Pieza por kg` se incrementa de una pieza entera en una. Al elegir monto para un producto `Peso`, el paso es `$1`. La captura manual respeta el mínimo, pero actualmente puede aceptar valores que no coincidan exactamente con el incremento. |
| `Imagen` | Ruta local de una imagen incluida en el proyecto (por ejemplo `assets/images/PRODUCTOS_Images/PROD-001.Imagen.200648.jpg`) o URL de imagen compartida. Las imágenes locales deben existir en la carpeta `assets/images/`; para Drive, comparte el archivo para que pueda leerse desde el sitio. |

El respaldo local incluye 69 productos: los 67 registros originales más Piloncillo Blanco y Piloncillo Moreno. Papaya y ambos piloncillos usan `Pieza por kg`; se solicitan piezas enteras y el importe se confirma después de pesarlas. El sitio consulta Google Sheets en línea; editar este CSV no cambia la hoja publicada, por lo que también hay que actualizar allí `Unidad`, `Tipo Venta`, `Precio`, `Cantidad Minima` e `Incremento` de cada producto.

Revisa los precios y datos de `productos_la_base_actualizado.csv` antes de importarlo. No reemplaces tu hoja existente con esta plantilla si eso borraría precios u otros datos.
Usa `productos_la_base_actualizado.csv`, no el archivo CSV anterior: la página lee el precio desde `Precio` y no utiliza una columna separada llamada `Precio por kg`.

---

## Archivos principales

- `index.html`: secciones, textos y datos de contacto.
- `styles.css`: paleta de colores, tipografías y diseño adaptable.
- `app.js`: sincronización con Google Sheets, filtros, búsqueda, lista de productos y WhatsApp.
- `productos_la_base_actualizado.csv`: plantilla local con la configuración de venta por pieza al precio por kilo.
- `products.js`: catálogo de respaldo local (se usa si no hay internet o si aún no configuras Google Sheets).
- `assets/images/`: imágenes de productos y categorías.
