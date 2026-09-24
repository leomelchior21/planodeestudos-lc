# Identidade visual

O design usa o logo oficial enviado pelo usuário, roxo institucional, amarelo, superfícies claras e controles adaptados a computador, tablet e celular. O fluxo de Dados → Matérias → Horários → Plano mantém o mesmo motor determinístico.

## Arquivos

- `public/logo-lourenco-castanho.jpg`: arquivo original enviado pelo usuário, sem alterações.
- `public/illustrations/student-hero.png`: ilustração estática de apoio, criada com a ferramenta integrada `image_gen.imagegen` (skill imagegen), com transparência preservada. Não foi usada a alternativa CLI/API.
- `src/components/student-hero.tsx`: composição do cabeçalho e desenho vetorial dos livros da tela de resultado.
- `src/app/design.css`: sistema visual compartilhado e ajustes responsivos.

Nenhum serviço de geração de imagens é chamado pelo site. A ilustração é servida localmente como qualquer outro arquivo estático.

## Prompt final da ilustração

```text
Use case: illustration-story. Asset type: finished decorative hero illustration for a Brazilian middle-school study-planning web app. Primary request: one welcoming, polished editorial illustration of a cheerful student aged around 13, with medium-brown skin, expressive dark eyes and wavy dark-purple hair loosely tied back, wearing a rich purple hoodie with a warm golden-yellow hood and a yellow backpack, holding two simple pale-lavender notebooks against their chest. Waist-up three-quarter portrait, looking slightly to the left toward the adjacent interface text, natural warm smile, confident and approachable. Modern 2D educational illustration, refined rounded shapes, crisp contour, subtle soft shading, contemporary and age-appropriate rather than childish. Color palette: deep violet #4C239A, vivid purple #6836D9, lavender, golden yellow #FFC83D and warm skin tones. Composition: portrait centered on a square canvas with generous breathing room, entire head, backpack straps and arms visible, bottom cropped cleanly at waist. A few very small purple and yellow four-point sparkles near shoulders. Background genuinely transparent, preserve alpha; no solid background, no rectangular scene. No words, no letters, no logos, no watermark, no UI, no photorealism, no large background decorations. Render as high-quality bitmap, 1024x1024.
```
