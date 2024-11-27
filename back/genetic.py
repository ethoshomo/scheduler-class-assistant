import random
import numpy as np
import pandas as pd
from deap import base, creator, tools, algorithms
from multiprocessing import *
import sys
import json
import time

def create_individual(d, da):
    i = [0] * len(d)
    chosen = set()
    
    # Aleatoriza busca no espaço
    method = random.random()

    # Escolhe de forma aletória
    if method < 0.5:
        d_random = d.copy()
        random.shuffle(d_random)

        for disc in d_random:
            a = set(da[disc])
            a = list(a - chosen)
            if len(a) != 0:
                selected = random.choice(a)
                chosen.add(selected)
                i[d.index(disc)] = selected
            else:
                i[d.index(disc)] = 0
    
    # Disciplina com menos candidatos primeiro
    else:
        for id in da:
            a = set(da[id])
            a = list(a - chosen)
            if len(a) != 0:
                selected = random.choice(a)
                chosen.add(selected)
                i[d.index(id)] = selected
            else:
                i[d.index(id)] = 0

    return i


def count_rooms(i, d, p):
    check = []
    for index, value in enumerate(i):
        if value == 0:
            continue
        check.append(d[index] in p[value].keys())
    return sum(check)


def measure_satisfaction(i, d, p):
    
    distinct_values_1 = set(v for v in i if v != 0)
    distinct_values_2 = list(v for v in i if v != 0)
    if len(distinct_values_1) != len(distinct_values_2):
        return 0.0
    
    preferences = []
    for index, value in enumerate(i):
        options = p.get(value, {})
        x = options.get(d[index], {})
        if value == 0 or x == {}:
            x = 0.0
        preferences.append(x)
    return sum(preferences)


def evaluate_individual(i, d, p):
    rooms = 10 * count_rooms(i, d, p)
    interests = measure_satisfaction(i, d, p)
    return (np.linalg.norm([rooms, interests]),)


def do_the_scheduled(courses, preferences, da, n_generations, population_size):

    def mutate(ind):
        if random.random() < mutation_probability:
            random_course = random.choice(courses)
            ind[courses.index(random_course)] = random.choice(da[random_course])
        return ind,

    def selection_elitism(population, n_individuals):
        elitism = int(0.2 * len(population))
        elite = tools.selBest(population, elitism)
        remaining_population = toolbox.population(n=n_individuals - elitism)
        return elite + remaining_population

    mutation_probability = 0.1
    crossover_probability = 0.7

    creator.create("FitnessMax", base.Fitness, weights=(1.0,))
    creator.create("Individual", list, fitness=creator.FitnessMax)

    toolbox = base.Toolbox()
    toolbox.register(
        "individual",
        tools.initIterate,
        creator.Individual,
        lambda: create_individual(courses, da),
    )

    toolbox.register(
        "population", 
        tools.initRepeat, 
        list, 
        toolbox.individual
    )

    toolbox.register(
        "evaluate", 
        lambda ind: evaluate_individual(ind, courses, preferences)
    )

    toolbox.register(
        "mate", 
        tools.cxTwoPoint
    )

    toolbox.register(
        "mutate", 
        mutate
    )

    toolbox.register(
        "select", 
        selection_elitism
    )

    pop = toolbox.population(n=population_size)

    for ind in pop:
        if not ind.fitness.valid:
            ind.fitness.values = toolbox.evaluate(ind)

    pop, _ = algorithms.eaSimple(
        pop, 
        toolbox, 
        cxpb=crossover_probability, 
        mutpb=mutation_probability, 
        ngen=n_generations, 
        stats=None, 
        halloffame=None, 
        verbose=False
    )

    for ind in pop:
        if not ind.fitness.valid:
            ind.fitness.values = toolbox.evaluate(ind)

    return tools.selBest(pop, 1)[0]


def run(courses, preferences, da, generation_number, population_size):
    da = dict(sorted(da.items(), key=lambda item: len(item[1])))
    better = do_the_scheduled(courses, preferences, da, generation_number, population_size)

    result_rows = []
    for index, student_id in enumerate(better):
        if student_id == 0:
            student_id = "No tutor"
            p = "No preference"
        else:
            p = preferences.get(student_id, {}).get(courses[index], {})

        result_rows.append(
            {
                "class": courses[index],
                "student": str(student_id),
                "grade": p,
                "preference": preferences.get(student_id, {}),
            }
        )
    df = pd.DataFrame.from_records(result_rows, columns=['class', 'students', 'grade', 'preference'])

    metrics = {
        "number_classes": count_rooms(better, courses, preferences),
        "total_classes": len(df),
        "avarage_grade": df[df['grade'] != 'No preference']['grade'].astype(float).mean(),
    }


    return metrics, result_rows


def process_file(file_path: str, courses_excel_path:str, excel_flag: bool, min_grade:float, preference_flag:bool) -> pd.DataFrame:
    df_courses = pd.read_excel(courses_excel_path)

    courses = []
    for _, row in df_courses.iterrows():
        course = row['Course Name']
        n = row['Number of Classes']
        for i in range(n):
            courses.append(f'{course} - Class {i + 1}')

    if excel_flag:
        df = pd.read_excel(file_path)
    else:
        df = pd.read_csv(file_path)

    if "Student ID" not in df.columns:
        raise Exception('Column "Student ID" is required in the tutors table!')

    if "Course Name" not in df.columns:
        raise Exception('Column "Course Name" is required in the tutors table!')

    if "Grade" not in df.columns:
        raise Exception('Column "Grade" is required in the tutors table!')

    if "Preference" not in df.columns:
        raise Exception('Column "Preference" is required in the tutors table!')

    df = df[["Student ID", "Course Name", "Grade", "Preference"]]

    df = df[df['Grade'] >= min_grade]

    df_courses = df_courses.loc[df_courses.index.repeat(df_courses['Number of Classes'])].reset_index(drop=True)
    df_courses['class_number'] = df_courses.groupby('Course Name').cumcount() + 1
    df_courses = df_courses.drop(columns='Number of Classes')
    
    df = pd.merge(df, df_courses, on='Course Name')
    df['Course Name'] = df['Course Name'] + ' - Class ' + df['class_number'].astype(str)

    # Removendo a coluna auxiliar 'contador', se necessário
    df = df.drop(columns='class_number').drop_duplicates()

    candidates = [i.item() for i in df["Student ID"].unique()]

    preferences = {}
    for candidate in candidates:
        df_filtered = df[df["Student ID"] == candidate].copy()

        preferences[int(candidate)] = {
            row["Course Name"]: row["Grade"] * np.exp(-0.4 * (row["Preference"] - 1)) if preference_flag == True else row["Grade"] for _, row in df_filtered.iterrows()
        }

    da = {}
    for course in courses:
        df_filtered = df[df["Course Name"] == course].copy().sort_values("Student ID")

        da[course] = [
            row["Student ID"]
            for _, row in df_filtered.iterrows()
            if row["Course Name"] == course
        ]

    return courses, candidates, preferences, da

if __name__ == "__main__":
    if len(sys.argv) < 3:
        result = {"success": False, "error": "No file path or parameters provided"}
        sys.stderr.write(json.dumps(result))
        sys.exit(1)

    try:
        start = time.time()

        students_excel_path = sys.argv[1]
        courses_excel_path = sys.argv[2]
        #min_grade = float(sys.argv[3])
        #preference_flag = bool(sys.argv[4])
        #generation_number = int(sys.argv[5])
        #population_size = int(sys.argv[6])

        min_grade = 0
        preference_flag = True
        generation_number = 50
        population_size = 500

        excel_flag = True
        if students_excel_path.endswith(".csv"):
            excel_flag = False

        courses, _, preferences, da = process_file(students_excel_path, courses_excel_path, excel_flag, min_grade, preference_flag)
        metrics, result_rows = run(courses, preferences, da, generation_number, population_size)
        end = time.time()
        metrics['execution_time'] = end - start

        result = {"success": True, "data": {"metrics": metrics, "results": result_rows}}

        sys.stdout.write(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        result = {"success": False, "error": str(e)}
        sys.stderr.write(json.dumps(result))
        sys.exit(1)
