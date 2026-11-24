# Guía de dibujo — Héroes en Combate

Nov 23, 2026 · @Damian

## Cómo funciona

Cada héroe se dibuja en 8 piezas sueltas (cabeza, torso, brazo, antebrazo, mano, muslo, pierna y pie), no en poses. El juego ya sabe mover esas piezas: las rota en cada articulación, así que todos los movimientos que viste (caminar, saltar, golpear, patear, cubrirse, girar, caer K.O., festejar) salen solos con tus dibujos.

- **Por qué piezas y no poses:** dibujar poses enteras serían unas 20 por héroe, con varios cuadros cada una (más de 200 dibujos en total). Con piezas son 8 por héroe, más algunos extras.
- **Escala 4x:** dibujás todo 4 veces más grande de lo que se ve en pantalla, así queda nítido en pantalla completa. Un héroe parado mide unos 600 px de alto en tu dibujo (150 px en el juego).
- **Formato:** PNG con fondo transparente, una pieza por archivo.
- **Programas:** Krita (gratis, para PC) o Photopea (gratis, en el navegador, parecido a Photoshop). Con tableta gráfica es más cómodo, pero se puede con mouse.
- **Plantillas:** en `juegos/pelea/arte/plantillas/` hay un PNG por pieza, con el lienzo del tamaño justo y los puntos de unión marcados. Abrís la plantilla, dibujás en una capa nueva encima y, antes de exportar, ocultás la capa de la plantilla.
- **En papel:** también se puede. Dibujá cada pieza por separado, sacale una foto derecha con buena luz y pasámela; yo la recorto y la llevo al tamaño. En digital queda más prolijo.

## Reglas para todas las piezas

Si cumplís estas 9 reglas, las piezas encajan solas en el juego.

1. **Todo mirando a la derecha.** El juego da vuelta la imagen cuando el héroe mira a la izquierda. Evitá letras o números en el traje, porque saldrían al revés.
2. **Brazos y piernas colgando derechos hacia abajo**, como en posición de firmes. El juego los rota.
3. **Una sola versión de cada brazo y cada pierna.** El juego usa la misma pieza para el lado de adelante y el de atrás, y oscurece la de atrás.
4. **Puntos de unión exactos.** Cada pieza tiene uno o dos puntos marcados en rojo en la plantilla (hombro, codo, cadera, rodilla, etc.). Ahí se engancha con la pieza vecina, así que tienen que quedar justo en ese lugar.
5. **Puntas redondeadas que pasen el punto de unión.** Cada brazo y pierna termina en una punta redonda que cubre el punto con margen (la plantilla marca el borde). Así, al doblar el codo o la rodilla no queda un hueco.
6. **Sin sombra en el piso.** El juego pone la suya. La luz viene de arriba.
7. **Contorno oscuro parejo:** de 6 a 8 px en todas las piezas (en el juego queda en 1,5–2 px).
8. **Fondo transparente.** Todo lo que no es el héroe tiene que quedar vacío.
9. **Colores libres.** Más abajo están los actuales como referencia. Para la pelea de un héroe contra sí mismo, el juego le pone un tinte al segundo, así que no hace falta otra versión.

## Las 8 piezas del cuerpo

Estas son las piezas de cada héroe, con el tamaño exacto del lienzo y dónde va cada punto de unión. Las coordenadas (x, y) se cuentan en píxeles desde la esquina de arriba a la izquierda del lienzo.

| Pieza | Archivo | Lienzo (ancho × alto, px) | Punto de unión 1 | Punto de unión 2 | Ancho del dibujo (px) | Qué dibujar |
| --- | --- | --- | --- | --- | --- | --- |
| Cabeza | `cabeza.png` | 200 × 200 | Centro de la cabeza (100, 100) | — | Círculo de 128 de diámetro | Cabeza de perfil o de ¾ mirando a la derecha. Incluye máscara, casco o bandana. Lo que sobresale (cresta, cintas) puede usar el resto del lienzo. |
| Torso | `torso.png` | 160 × 240 | Cadera (80, 210) | Hombros (80, 34) | 100 a 120 | Del cinturón al cuello, de costado o de ¾. Que baje unos 25 px por debajo de la cadera y suba un cuello corto por arriba de los hombros. |
| Brazo | `brazo.png` | 64 × 164 | Hombro (32, 32) | Codo (32, 132) | 44 | Del hombro al codo, colgando derecho. |
| Antebrazo | `antebrazo.png` | 64 × 160 | Codo (32, 32) | Muñeca (32, 128) | 40 | Del codo a la muñeca, con puño de guante si tiene. |
| Mano | `mano.png` | 64 × 64 | Centro (32, 32) | — | Puño de 56 | Puño cerrado, nudillos hacia la derecha. Se pone sobre la muñeca. |
| Muslo | `muslo.png` | 72 × 196 | Cadera (36, 36) | Rodilla (36, 160) | 56 | De la cadera a la rodilla. |
| Pierna | `pierna.png` | 72 × 196 | Rodilla (36, 36) | Tobillo (36, 160) | 48 | De la rodilla al tobillo (la canilla). |
| Pie | `pie.png` | 96 × 64 | Tobillo (36, 24) | — | Bota de 80 de largo | Bota de costado, punta hacia la derecha. La suela toca el borde de abajo. |

Distancias entre puntos de unión: hombro a codo 100 px, codo a muñeca 96 px, cadera a rodilla 124 px, rodilla a tobillo 124 px y cadera a hombros 176 px. El centro de la cabeza queda 84 px arriba de los hombros.

El hombro está en el centro de arriba del torso porque el héroe se ve de costado: los dos brazos salen del mismo punto, uno delante y otro detrás del cuerpo. Lo mismo pasa con las dos piernas en la cadera.

## Proporciones del héroe armado

Armado y parado, el héroe mide unos 600 px de alto (a 4x), con la cabeza grande de estilo dibujo animado: la cabeza ocupa más o menos 1/5 de la altura y las piernas casi la mitad.

| Tramo (desde el piso) | Altura del tramo (px) | Altura acumulada (px) |
| --- | --- | --- |
| Piso → tobillo (pie) | 36 | 36 |
| Tobillo → rodilla (pierna) | 124 | 160 |
| Rodilla → cadera (muslo) | 124 | 284 |
| Cadera → hombros (torso) | 176 | 460 |
| Hombros → centro de la cabeza | 84 | 544 |
| Centro → punta de la cabeza | 64 | 608 |

Con el brazo colgando, el puño llega a la mitad del muslo. Si querés un héroe más grandote (como Centinela), engordá el torso y los brazos dentro del lienzo, pero no muevas los puntos de unión: el largo de los huesos es el mismo para los cuatro.

La referencia muestra las piezas separadas, cada una con su lienzo y sus puntos rojos, y cómo quedan armadas.

&#91;image: Piezas a escala 4x con sus puntos de unión, y el héroe armado con la altura de cada articulación desde el piso\]

## Héroe por héroe

Los cuatro usan las mismas 8 piezas de la tabla de arriba. Acá está qué lleva cada pieza y qué extras tiene cada uno. Los colores son los que usa el juego hoy; podés cambiarlos.

### Arácnido — rápido y saltarín

Colores actuales: violeta oscuro `#4B2A82` y verde lima `#9BE33B`. Es el más flaco y ágil.

| Pieza | Qué dibujar |
| --- | --- |
| Cabeza | Máscara entera, con ojos de araña (hoy son 4 ojitos verdes) y líneas de telaraña. |
| Torso | Emblema de araña en el pecho y líneas de telaraña en el traje. Cintura finita. |
| Brazo, antebrazo y muslo | Traje con líneas de telaraña o franjas. Delgados (podés usar menos ancho que el de la tabla). |
| Mano y pie | Guantes y botas del color de acento, con alguna punta o garra si querés. |

Sin extras de cuerpo. Sus redes están en Proyectiles y efectos.

### Doble Filo — espadachín que se cura solo

Colores actuales: gris `#4B5563` y naranja `#FF8A1F`.

| Pieza | Qué dibujar |
| --- | --- |
| Cabeza | Máscara con ojos blancos achinados y bandana naranja. Las dos cintas de la bandana salen hacia atrás (a la izquierda del lienzo). |
| Torso | Cinturón y una correa cruzada en diagonal, donde van las vainas. Las espadas de la espalda las pone el juego con la pieza `espada.png`. |
| Brazo, antebrazo, muslo y pierna | Traje gris con rodilleras o refuerzos naranjas. |
| Mano y pie | Guantes y botas naranjas. |

**Extra:** `espada.png`, lienzo 48 × 288 px, una katana vertical con la punta hacia abajo. La empuñadura arriba, y el punto donde la agarra la mano en (24, 40). La hoja mide unos 240 px. El juego la usa en la mano al atacar y cruzada en la espalda el resto del tiempo.

### Protón — armadura que vuela

Colores actuales: plateado `#B8C4D0` y turquesa brillante `#18D3C5`. Es una armadura con placas.

| Pieza | Qué dibujar |
| --- | --- |
| Cabeza | Casco cerrado con visor brillante (hoy es una raya turquesa) y una aleta arriba. |
| Torso | Placas de armadura, hombreras grandes y un núcleo hexagonal brillante en el pecho. |
| Brazo y antebrazo | Placas metálicas. En el antebrazo, el cañón o propulsor de la mano. |
| Muslo y pierna | Placas, con las juntas marcadas. |
| Mano | Guantelete con la palma brillante. |
| Pie | Bota pesada con la tobera del propulsor abajo. |

**Extra:** `fuego_1.png` y `fuego_2.png`, lienzo 48 × 128 px cada uno, una llamita apuntando hacia abajo y enganchada arriba en (24, 8). Son dos cuadros que se alternan para que parezca que tiembla; hacé el segundo un poco más largo.

### Centinela — defensor del escudo

Colores actuales: verde `#2F6B3A`, bronce `#C98B2B` y cresta roja `#B03030`. Es el más grandote: podés hacer el torso y los brazos más anchos.

| Pieza | Qué dibujar |
| --- | --- |
| Cabeza | Casco de bronce estilo guerrero antiguo, con cresta roja arriba y abertura en T para los ojos. |
| Torso | Pechera con un triángulo de bronce y cinturón. |
| Brazo, antebrazo, muslo y pierna | Traje verde con brazales y grebas de bronce. |
| Mano y pie | Guantes y sandalias o botas de bronce. |

**Extra:** `escudo.png`, lienzo 192 × 192 px, escudo redondo de frente con el centro en (96, 96) y 176 px de diámetro. El juego lo usa en el brazo, lo hace girar cuando lo tira y lo muestra en la pantalla de elección. Que se vea bien aunque esté girando (un diseño centrado funciona mejor).

## Proyectiles y efectos

Todos se dibujan viajando hacia la derecha, con el centro en el medio del lienzo (salvo la onda, que se apoya en el piso). Son opcionales: lo que no dibujes lo sigue haciendo el juego como ahora.

| Héroe | Archivo | Lienzo (px) | Punto de enganche | Qué es |
| --- | --- | --- | --- | --- |
| Arácnido | `red.png` | 136 × 136 | Centro (68, 68) | Bolita de telaraña del combo. El juego la hace girar. |
| Arácnido | `red_gigante.png` | 384 × 384 | Centro (192, 192) | Red enorme del súper: telaraña redonda con rayos y anillos. |
| Arácnido | `red_atrapado.png` | 400 × 600 | Centro (200, 300) | La red que envuelve al rival cuando queda pegado. Tiene que dejar ver al rival por los huecos. |
| Protón | `energia.png` | 192 × 192 | Centro (96, 96) | Bola de energía del combo: centro blanco, halo turquesa y una colita hacia la izquierda. |
| Protón | `rayo.png` | 128 × 240 | Centro vertical (y = 120) | Un tramo del rayo del súper. El juego lo repite a lo ancho de la pantalla, así que el borde izquierdo tiene que empalmar con el derecho. |
| Protón | `rayo_origen.png` | 192 × 192 | Centro (96, 96) | El brillo en las manos donde nace el rayo. |
| Centinela | `escudo.png` | 192 × 192 | Centro (96, 96) | El mismo escudo del brazo: es el que tira de bumerán. |
| Centinela | `onda.png` | 256 × 192 | Abajo al medio (128, 192) | Onda sísmica del súper: arcos de energía y piedritas saliendo del piso. El borde de abajo es el piso. |
| Todos | `impacto.png` | 128 × 128 | Centro (64, 64) | Estrella de golpe que aparece al pegar (opcional). |

Para los brillos (energía, rayo, fuego) usá colores claros con bordes suaves y sin contorno negro: así parecen luz.

## Dónde guardarlos y lista para ir tachando

Guardá cada héroe en su carpeta, con los nombres de archivo exactos de las tablas (en minúsculas, sin tildes):

```
juegos/pelea/arte/
  plantillas/      ← las plantillas para dibujar encima
  aracnido/        cabeza.png torso.png brazo.png antebrazo.png mano.png muslo.png pierna.png pie.png
                   red.png red_gigante.png red_atrapado.png
  doblefilo/       las 8 piezas + espada.png
  proton/          las 8 piezas + fuego_1.png fuego_2.png energia.png rayo.png rayo_origen.png
  centinela/       las 8 piezas + escudo.png onda.png
  efectos/         impacto.png
```

Empezá por un solo héroe y avisame cuando lo tengas: lo conecto al juego, lo probamos en movimiento y ajustamos antes de seguir con los demás. Mientras falte una pieza, el juego la sigue dibujando como ahora, así que se puede ir de a poco.

- [x] Arácnido (Spider-Man): 8 piezas del cuerpo
- [x] Arácnido (Spider-Man): red, red gigante y red de atrapado
- [ ] Doble Filo: 8 piezas del cuerpo
- [ ] Doble Filo: espada
- [ ] Protón: 8 piezas del cuerpo
- [ ] Protón: fuego (2 cuadros), energía, rayo y origen del rayo
- [ ] Centinela: 8 piezas del cuerpo
- [ ] Centinela: escudo y onda
- [ ] Opcional: impacto

Antes de pasarme cada pieza, fijate tres cosas: que mire a la derecha, que el fondo sea transparente y que los puntos rojos de la plantilla hayan quedado justo sobre las articulaciones.
