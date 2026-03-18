# MuseuDle 🏛️💻

Um joguinho estilo Wordle focado na história da computação. A ideia é adivinhar um artefato (seja linguagem, hardware, algoritmo ou uma pessoa importante) usando as dicas que vão aparecendo. Verde para acerto, amarelo se bater em parte, etc. Ah, o jogo também te dá um toque com setinhas ⬆️ ⬇️ pra avisar se o palpite é mais novo ou mais antigo que a resposta certa.

O visual tenta dar aquela vibe de museu clássico de tecnologia. Fiz tudo bem leve e direto ao ponto: só HTML, CSS e JS puro (sem frameworks pesados), porque aí fica moleza pra jogar isso num Joomla ou qualquer outro canto no futuro. Seu progresso do dia também fica garantido lá no LocalStorage do navegador.

## Como jogar

Não precisa ficar instalando nada. Basta abrir o arquivo `index.html` direto no seu navegador e jogar. 

Se estiver com o servidorzinho Python rodando (o que é ideal pra não dar b.o de CORS lendo o JSON), é só clicar no link abaixo:
👉 [http://localhost:8080/](http://localhost:8080/)

Valeu! Se quiser botar uns itens novos ou mexer nas dicas diárias, é só editar lá no `data/itens.json`.
