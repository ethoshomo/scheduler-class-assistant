import random
import numpy as np
import pandas as pd
from deap import base, creator, tools
import pandas as pd
from multiprocessing import *
import sys
import json

def criar_individuo(d, da):
    """ 
    Os individuos são criados como se fossem a lista de disciplinas,
    sendo certo que cada valor é o nUSP do candidato. Caso a quantidade 
    de candidatos seja menor que a de disciplinas, serão preenchidos zeros
    até total de disciplinas.
    """
    i = []
    escolhidos = set()
    for alunos in d:
        a = set(da[alunos])
        a = list(a - escolhidos)
        if len(a) != 0:
            escolhido = random.choice(a)
            escolhidos.add(escolhido)
            i.append(escolhido)
        # Representa sala sem candidatos ou que os candidatos 
        # foram escolhidos para outras disciplinas
        else: 
            i.append(0)
    return i

def contar_salas(i, d, p):
    """ 
    Na evolução, os monitores podem ser designados para salas equivocadas.
    Por isso, precisamos checar se eles possuem formação na disciplina. A
    quantidade de salas reflete as designações corretas.
    """
    check = []
    for indice, valor in enumerate(i):
        if valor == 0: continue
        # dict_keys(['SME0341 - Álgebra Linear e Equações Diferenciais'])
        check.append(d[indice] in p[valor].keys())
    return sum(check)

def medir_satisfacao(i, d, p):
    """ 
    A satisfação do conjunto de monitores foi modelada utilizando uma 
    função exponencial, a qual atribui maior valor para preferência 1 
    e menor valor para a última disciplina. 
    """
    preferencias = []
    for indice, valor in enumerate(i):
        opcoes = p.get(valor, {})
        x = opcoes.get(d[indice], {})
        if valor == 0 or x == {}: 
            x = 0.0
        preferencias.append(np.exp(-0.4 * (x - 1)))
    return sum(preferencias)

def avaliar_individuo(i, d, p):
    """ 
    A avaliação do individuo é uma função de distância em relação à origem.
    Nesse caso, temos a quantidade de salas no eixo X e a satisfação do 
    conjunto de monitores no eixo y. Objetiva-se aumentar os valores em X e
    Y. Por isso, quanto maior o valor, melhor o resultado. Atribui-se peso
    na sala porque o quesito deve prevalecer sobre a satisfação dos monitores.
    """
    salas = len(i)*contar_salas(i, d, p)
    interesses = medir_satisfacao(i, d, p)
    return np.linalg.norm([salas, interesses]),

def do_the_scheduled(disciplinas, candidatos, preferencias, da, resultados):
    """ 
    Função paralelizada que recebe os dados de processamento e inicia um
    algoritmo genético para realizar uma busca heurística. A cada geração
    serão criados 2000 indivíduos e ao final serão preservados 10% da população
    mais adaptada (melhor avaliada). Em 20% dos indivíduos, haverá mutações aleatórias, 
    entendidas como embaralhamento dos elementos dos indivíduos (visando 
    explorar o espaço de busca).
    """
    tamanho_populacao = 1000
    n_geracoes = 200
    preservacao = 0.2

    creator.create('FitnessMax', base.Fitness, weights=(1.0,))
    creator.create('Individual', list, fitness=creator.FitnessMax)

    toolbox = base.Toolbox()
    toolbox.register('individual', tools.initIterate, creator.Individual, lambda: criar_individuo(disciplinas, da))
    toolbox.register('population', tools.initRepeat, list, toolbox.individual)
    toolbox.register('evaluate', lambda ind: avaliar_individuo(ind, disciplinas, preferencias))
    toolbox.register('mutate', tools.mutShuffleIndexes, indpb=0.2)
    toolbox.register('select', tools.selBest)

    pop = toolbox.population(n=tamanho_populacao)

    for _ in range(n_geracoes):
        for ind in pop:
            if not ind.fitness.valid:
                ind.fitness.values = toolbox.evaluate(ind)

        elitismo = int(preservacao * len(pop))
        elite = toolbox.select(pop, elitismo)

        offspring = toolbox.clone(pop)
        for mutant in offspring:
            if random.random() < 0.2:
                toolbox.mutate(mutant)
                del mutant.fitness.values

        for ind in offspring:
            if not ind.fitness.valid:
                ind.fitness.values = toolbox.evaluate(ind)

        pop[:] = elite + offspring[:len(pop) - elitismo]

    resultados.put(tools.selBest(pop, 1)[0])

def run(disciplinas, candidatos, preferencias, da):
    processos = []
    resultados = Queue()
    
    # Paralelizar para rodar n vezes
    for _ in range(cpu_count()):
        process = Process(target=do_the_scheduled, args=(disciplinas, candidatos, preferencias, da, resultados))
        process.start()
        processos.append(process)

    # Esperar executar a paralelização
    for process in processos:
        process.join()

    # Selecionar o melhor resultado obtido
    better = list()
    old_aval = 0
    while not resultados.empty():
        res = resultados.get()
        aval = avaliar_individuo(res, disciplinas, preferencias)
        if aval[0] > old_aval:
            old_aval = aval[0]
            better = res

    metrics = {
        'best_creature': better,
        'number_classes': contar_salas(better, disciplinas, preferencias),
        'satisfaction': medir_satisfacao(better, disciplinas, preferencias)
    }

    result_rows = []

    for index, nUSP in enumerate(better):
        if nUSP == 0:
            nUSP = 'Sem monitor'
            p = 'Sem preferência'
        else:
            p = preferencias.get(nUSP, {}).get(disciplinas[index], {})
        
        result_rows.append({'class':disciplinas[index], 'student': str(nUSP), 'grade':p, 'preference': preferencias.get(nUSP, {})})

    return metrics, result_rows

def process_file(excel_path:str) -> pd.DataFrame:
    df = pd.read_excel(excel_path)
    
    if 'NUSP' not in df.columns:
            raise Exception('Coluna "NUSP" é obrigatória na tabela dos monitores!')
            
    if 'Disciplina' not in df.columns:
        raise Exception('Coluna "Disciplina" é obrigatória na tabela dos monitores!')
        
    if 'Turma' not in df.columns:
        raise Exception('Coluna "Turma" é obrigatória na tabela dos monitores!')
        
    if 'Nota' not in df.columns:
        raise Exception('Coluna "Nota" é obrigatória na tabela dos monitores!')
        
    if 'Preferencia' not in df.columns:
        raise Exception('Coluna "Preferencia" é obrigatória na tabela dos monitores!') 
    
    df = df[['NUSP', 'Disciplina', 'Turma', 'Nota', 'Preferencia']]
    
    df['Disciplina'] = df['Disciplina'] + ' - Turma ' + df['Turma'].astype(str)
    
    disciplinas = list(df['Disciplina'].unique())
    candidatos = [i.item() for i in df['NUSP'].unique()]
    
    preferencias = {}
    for candidato in candidatos:
        df_filtrado = df[df['NUSP'] == candidato].copy().sort_values('Preferencia')
        
        preferencias[int(candidato)] = {row['Disciplina']: row['Nota'] for _, row in df_filtrado.iterrows()}
    
    da = {}
    for disciplina in disciplinas:
        df_filtrado = df[df['Disciplina'] == disciplina].copy().sort_values('NUSP')
        
        da[disciplina] = [row['NUSP'] for _, row in df_filtrado.iterrows() if row['Disciplina'] == disciplina]
    
    
    return disciplinas, candidatos, preferencias, da

if __name__ == "__main__":
    if len(sys.argv) < 2:
        result = {
            "success": False,
            "error": "No file path provided"
        }
        sys.stderr.write(json.dumps(result))
        sys.exit(1)

    try:
        excel_path = sys.argv[1]
        disciplinas, candidatos, preferencias, da = process_file(excel_path)
        metrics, result_rows = run(disciplinas, candidatos, preferencias, da)
        
        result = {
            "success": True,
            "data": {
                "metrics": metrics,
                "results": result_rows
            }
        }
        
        sys.stdout.write(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }
        sys.stderr.write(json.dumps(result))
        sys.exit(1)
