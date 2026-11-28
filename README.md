# Recaudería La Base

Sitio web para presentar la recaudería, explorar productos y preparar una lista para consultar por WhatsApp. Permite editar cantidades, guardar favoritos en el dispositivo y elegir modalidad de entrega y forma de pago preferida; si un producto está agotado, sugiere alternativas disponibles de la misma categoría. No procesa pagos en línea. Está hecho con HTML, CSS y JavaScript sin dependencias complejas.

Al enviar una lista, el sitio pide opcionalmente el nombre de la clienta o cliente, la modalidad (recoger o envío) y la forma de pago preferida. Para recoger están disponibles efectivo, transferencia y tarjeta; para envío, efectivo y transferencia. Las preferencias se agregan al mensaje prellenado de WhatsApp. WhatsApp requiere que la persona revise y pulse Enviar; el sitio no puede mandarlo automáticamente. El folio se crea en el navegador y sirve para identificar la conversación; no es un número de pedido registrado en una base de datos. El pedido queda confirmado cuando la recaudería responde por WhatsApp.

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

Usa estos encabezados. La plantilla pone `Nombre`, `Precio` y los datos de pieza juntos para facilitar la edición desde el teléfono. El sitio encuentra las columnas por su encabezado; conserva los nombres de encabezado y el `ID` permanente aunque cambies el orden.

| Columna | Valores y uso |
|---|---|
| `ID` | Identificador único y permanente, por ejemplo `PROD-068`. No lo repitas ni lo cambies después: la lista del cliente se guarda usando este valor. |
| `Nombre` | Texto requerido que verá el cliente. Los cinco nombres de hierbas configurados son `Cilantro`, `Perejil`, `Hierbabuena`, `Epazote` y `Manzanilla`; el código los fuerza a venta por `Monto`. |
| `Precio` | Precio regular, como número sin texto. `Peso` y `Pieza por kg`: precio por kilogramo; `Unidad`: precio por una unidad de la etiqueta, por ejemplo una pieza o bolsa. `Monto`: déjalo vacío; la tarjeta muestra el mínimo. Para `Pieza por kg`, el total exacto no se calcula hasta conocer el peso real. Conserva aquí el precio regular durante una oferta. |
| `Precio oferta` | Opcional, como número sin texto y en la misma unidad que `Precio`. Déjalo vacío si no hay oferta. Solo se activa cuando es mayor que cero y menor que `Precio`; se muestra el precio regular tachado, el precio de oferta y el porcentaje de descuento. El precio de oferta también se usa para los cálculos estimados. |
| `Peso aprox. por pieza (g)` | Peso orientativo en gramos de una pieza individual, por ejemplo `350`. No inventes el dato si varía demasiado. Si queda vacío, la opción por pieza sigue disponible cuando esté habilitada, pero el peso y el precio aproximados aparecerán como pendientes. También permite mostrar una referencia para productos `Pieza por kg`; el peso y total definitivos se confirman al pesarlos. |
| `Permitir compra por pieza` | Para productos cuyo `Tipo Venta` sea `Peso`, usa `SI` para ofrecer tanto peso como piezas, o `NO` para dejar solo peso. No cambia el precio por kilo ni elimina la opción `Monto`. En productos de tipo `Unidad`, `Monto` o `Pieza por kg`, no hace falta este ajuste. |
| `Tipo Venta` | Preferentemente escribe `Peso`, `Unidad`, `Monto` o `Pieza por kg`. Esta última permite pedir piezas enteras cuyo importe final depende del peso real: se muestra el precio por kilo y el total queda pendiente hasta pesarlas. El mínimo y el incremento de piezas son 1. Se aceptan también `kilogramo` como `Peso`, `dinero`/`pesos` como `Monto`, y `pieza`/`bolsa`/`paquete` como `Unidad`. En blanco, se infiere `Peso` para `kg`/`gramo(s)`, `Monto` para la unidad `monto` y `Unidad` para las demás. |
| `Categoria` | Texto que agrupa y filtra productos. Para mantener consistencia, usa `Frutas`, `Verduras y Legumbres`, `Chiles`, `Chiles Secos`, `Semillas y abarrotes` o `Hierbas`. Otras categorías aparecen en el filtro, pero no tienen tarjeta propia en la sección de categorías. |
| `Unidad` | Para `Peso`, usa `kg` porque el precio es por kilogramo. Para `Unidad`, la etiqueta es libre: `pieza`, `rama`, `bolsa`, `charola`, `cuarto`, `manojo` o `paquete`. Para `Pieza por kg`, usa `pieza`. Para `Monto`, usa `monto`. |
| `Activo` | `SI` muestra el producto; `NO` lo oculta. También se aceptan `TRUE`, `VERDADERO`, `1`, `YES`, `ACTIVO` y casilla marcada/desmarcada. Si se deja vacío, se muestra. |
| `Estado` | Déjalo vacío o usa `Disponible` para el estado normal. `Agotado`, `Sin existencia` o `Terminado` desactivan la compra. Textos que contengan `Especial`, `Llegó`, `Pocas` o `Temporada` pueden aparecer en la vitrina de especiales. |
| `Destacado` | `SI` o `TRUE` activa la insignia de más vendido. Vacío/`NO` no lo activa. Algunos productos populares ya se destacan automáticamente por su nombre. |
| `Cantidad Minima` | Según `Tipo Venta`: gramos mínimos para `Peso` (por defecto 50), monto mínimo en pesos para `Monto`, o cantidad mínima para `Unidad`. `Pieza por kg` siempre comienza en 1 pieza. En el catálogo, cilantro usa `$5` y las demás hierbas `$2`; los demás productos con venta por monto requieren al menos `$10` (si se configura un mínimo mayor, se conserva). Al elegir monto para un producto `Peso`, el mínimo es `$10` y no se configura con esta columna. |
| `Incremento` | Según `Tipo Venta`: paso en gramos para `Peso` (por defecto 50), pesos por paso para `Monto` (por defecto $1), o cantidad por paso para `Unidad` (por defecto 1). `Pieza por kg` se incrementa de una pieza entera en una. Al elegir monto para un producto `Peso`, el paso es `$1`. La captura manual respeta el mínimo, pero actualmente puede aceptar valores que no coincidan exactamente con el incremento. |
| `Imagen` | Ruta local de una imagen incluida en el proyecto (por ejemplo `assets/images/PRODUCTOS_Images/PROD-001.Imagen.200648.jpg`) o URL de imagen compartida. Las imágenes locales deben existir en la carpeta `assets/images/`; para Drive, comparte el archivo para que pueda leerse desde el sitio. |

Los productos disponibles con una oferta válida aparecen en la sección **Ofertas en La Base**, antes de los filtros del catálogo; esta sección se oculta si no hay ofertas. Al explorar el catálogo, los productos disponibles en oferta se muestran antes que los más vendidos disponibles.

La plantilla actual contiene 70 productos. Los productos con `Peso` y `Permitir compra por pieza = SI` ofrecen las tres opciones: peso, pieza y monto; las hierbas por monto conservan su forma actual de compra. La pieza muestra un peso y un precio aproximados solo cuando `Peso aprox. por pieza (g)` tiene un valor; el total final se confirma después de pesarlo. Papaya, Aguacate y los piloncillos usan `Pieza por kg` y conservan la compra por pieza entera.

El sitio consulta Google Sheets en línea; editar este CSV no cambia la hoja publicada. Para usar estos campos, copia también los encabezados `Precio oferta`, `Peso aprox. por pieza (g)` y `Permitir compra por pieza` a la hoja publicada. Puedes reordenar las columnas, pero conserva sus encabezados y los `ID`; evita pegar sobre precios u otros datos que quieras conservar.

Los precios de `Precio` se leen como pesos reales, sin multiplicarlos por 100 ni modificarlos en la hoja. Los importes calculados se redondean por producto al peso más cercano (50 centavos suben al siguiente peso) y el total de la lista suma esos importes redondeados. Las cantidades de gramos conservan su precisión.

La portada usa tres imágenes de `assets/images/CARRUSEL_Images/`: Ofertas, Llegó hoy y Paquetes. El carrusel permite avanzar, retroceder, seleccionar una tarjeta, usar flechas del teclado y deslizar en pantallas táctiles; avanza automáticamente cada 2.6 segundos, pausa al interactuar y respeta la preferencia de movimiento reducido. Las tarjetas de categoría aplican el filtro ignorando diferencias de mayúsculas y acentos y llevan directamente a los resultados. La sección de paquetes usa `Ponche.webp` y `ensalada_de-manzana.jpg` como imágenes independientes, con bases editables de 10 personas e ingredientes del catálogo. Al agregar un paquete, aparece como tarjeta compacta en `Mi lista`; al abrirla se muestra un editor desplazable para modificar o quitar ingredientes y guardar los cambios. La lista y el editor conservan zonas de desplazamiento independientes y el total permanece visible. El ponche calcula dos piezas de piloncillo como aproximación; el importe definitivo depende de su peso. Los paquetes se guardan en el dispositivo y WhatsApp separa los paquetes de los productos sueltos, mostrando ingredientes, cantidades y total estimado. Las recetas están en `app.js`, no requieren columnas adicionales en el CSV mientras no quieras vender los paquetes como productos independientes.

Revisa los precios y datos de `productos_la_base_actualizado.csv` antes de importarlo. No reemplaces tu hoja existente con esta plantilla si eso borraría precios u otros datos.
Usa `productos_la_base_actualizado.csv`, no el archivo CSV anterior: la página lee el precio desde `Precio` y no utiliza una columna separada llamada `Precio por kg`.

---

## Archivos principales

- `index.html`: secciones, textos y datos de contacto.
- `styles.css`: paleta de colores, tipografías y diseño adaptable.
- `app.js`: sincronización con Google Sheets, filtros, búsqueda, precios de oferta, lista de productos y WhatsApp.
- `productos_la_base_actualizado.csv`: plantilla local con la configuración de venta por pieza al precio por kilo.
- `products.js`: catálogo de respaldo local (se usa si no hay internet o si aún no configuras Google Sheets).
- `assets/images/`: imágenes de productos y categorías.
