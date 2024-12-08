# Scheduler-ClassAssistant

## Descrição

O **Scheduler-ClassAssistant** é uma ferramenta robusta para criação e otimização de horários acadêmicos. Ele utiliza conceitos de programação matemática, como algoritmos genéticos e métodos inteiros, para resolver problemas complexos de alocação de recursos e restrições. Este projeto foi projetado para facilitar o gerenciamento de horários, levando em conta critérios como:

- Disponibilidade de professores.
- Capacidade de salas.
- Restrições de horários (preferências e indisponibilidades).
- Otimização de tempos ociosos entre aulas.

Com uma interface gráfica intuitiva, o sistema possibilita visualização e ajustes nos cronogramas gerados, unindo o poder de técnicas avançadas de otimização com usabilidade prática.

---

## Programação Matemática e Modelagem

A construção do **Scheduler-ClassAssistant** é baseada em dois pilares principais de otimização:

### 1. **Algoritmos Genéticos (Genetic Algorithm - GA)**

Os algoritmos genéticos são inspirados pela seleção natural. Neste projeto, eles são utilizados para encontrar soluções quase ótimas para o problema de alocação de horários. A abordagem envolve os seguintes passos:

1. **População Inicial**:
   - Cada solução (indivíduo) representa um conjunto de horários gerado aleatoriamente.
   - Soluções são representadas como cromossomos, onde genes são elementos do cronograma.

2. **Função de Aptidão**:
   - Avalia quão boa é uma solução, considerando:
     - Conflitos de horário (ex.: dois professores alocados na mesma sala).
     - Preferências de professores e alunos.
     - Minimização de tempos ociosos.
   - Quanto menor o número de conflitos e mais próximo das preferências, maior a pontuação da solução.

3. **Operadores Genéticos**:
   - **Seleção**: Soluções com maior aptidão têm maior chance de reprodução.
   - **Cruzamento (Crossover)**: Combina partes de dois indivíduos para criar uma nova solução.
   - **Mutação**: Introduz pequenas alterações para explorar mais o espaço de busca e evitar estagnação.

4. **Evolução**:
   - Iterativamente, novas gerações de soluções são criadas até que um critério de parada seja alcançado (ex.: número de gerações ou aptidão satisfatória).

### 2. **Métodos Inteiros**
Para situações em que soluções mais rígidas são necessárias, métodos inteiros são utilizados para modelar e resolver o problema de forma determinística. 

#### Modelo Inteiro:

## Variáveis de Decisão:
- \( x_{ad} \): Indica se o monitor \( a \) é alocado para a disciplina \( d \) (1 para alocado, 0 para não alocado).
- \( y_d \): Indica se a disciplina \( d \) não possui monitor (1 para não atendida, 0 para atendida).

---

## Função Objetivo:
O objetivo é maximizar a pontuação total dos monitores alocados às disciplinas, priorizando as maiores notas dos monitores e minimizando o número de disciplinas sem monitores. A pontuação é calculada como:

- **Soma ponderada das médias dos monitores alocados às disciplinas**.
- **Penalização pelo número de disciplinas sem monitores**.

Isso garante um equilíbrio entre maximizar o desempenho acadêmico e atender ao maior número possível de disciplinas.

---

## Restrições:
1. **Alocação por disciplina**:
   - Cada disciplina deve ter no máximo um monitor alocado.
   - Se nenhum monitor for alocado, a disciplina é marcada como "não atendida".

2. **Limite por monitor**:
   - Cada monitor pode ser alocado a, no máximo, uma disciplina.

3. **Preferências dos monitores**:
   - Um monitor só pode ser alocado a uma disciplina se tiver manifestado interesse nela.

4. **Natureza das variáveis**:
   - As variáveis \( x_{ad} \) e \( y_d \) são binárias (0 ou 1).

---

## Explicação dos Parâmetros:
- \( A \): Conjunto de monitores disponíveis.
- \( D \): Conjunto de disciplinas disponíveis.
- \( s_{ad} \): Indica se o monitor \( a \) está disposto a monitorar a disciplina \( d \) (1 para disponível, 0 para indisponível).
- \( N_a \): Nota média do monitor \( a \), utilizada como critério de priorização para alocação.


---

## Como Usar

Pré-requisitos
Backend:

Python 3.8 ou superior.

Instale as dependências com:


`pip install -r back/requirements.txt`

Frontend:

Node.js e PNPM.

Instale as dependências com:

`cd front
pnpm install`

Executando o Projeto
Backend:

Execute diretamente usando:


`python back/genetic.py`

Frontend:

Para desenvolvimento:


`cd front
pnpm run dev`

Para construir o projeto:

`pnpm run build`

Docker:

O projeto pode ser executado com Docker:

`docker build -t scheduler-assistant .
docker run -p 3000:3000 scheduler-assistant`

---

## Tecnologias e Ferramentas Utilizadas

- **Python**: Linguagem principal para processamento e algoritmos.
- **DEAP**: Biblioteca para implementação de algoritmos genéticos.
- **SciPy/PuLP**: Bibliotecas para resolução de problemas lineares.
- **Node.js e PNPM**: Ferramentas para o desenvolvimento e gerenciamento do frontend.
- **Tauri**: Framework para construção de aplicações desktop.
- **Tailwind CSS**: Estilização responsiva para interfaces modernas.

---


## Benefícios do Modelo

- **Flexibilidade**: Combina métodos heurísticos (algoritmos genéticos) com abordagens exatas (programação inteira).
- **Otimização Personalizada**: Adapta-se a diferentes critérios de priorização (ex.: minimizar tempos ociosos ou maximizar preferências).
- **Escalabilidade**: Projetado para lidar com grandes volumes de dados (várias turmas, professores e horários).
- **Eficiência Computacional**: Algoritmos otimizados para rápida convergência.

---

## Licença

O projeto **Scheduler Class Assistant** tem licença MIT, frisando-se que não nos responsabilizamos por eventuais danos que o uso do programa possa causar.

---
## Membros do Projeto

- Carlos Filipe de Castro Lemos
- Gabriel Barbosa de Oliveira
- Henrique Souza Marques
- João Pedro Matos de Deus
- Lucas Greff Meneses
