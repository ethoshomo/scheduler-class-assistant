import random
import numpy as np
import pandas as pd
from deap import base, creator, tools
import pandas as pd
from multiprocessing import *
import sys
import json


def create_individual(d, da):
    """
    Individuals are created as a list of courses,
    where each value is the student ID of the candidate. If the number
    of candidates is less than the number of courses, zeroes will be filled
    until the total number of courses is reached.
    """
    i = [0] * len(d)
    chosen = set()
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
    return i


def count_rooms(i, d, p):
    """
    During evolution, tutors may be assigned to incorrect rooms.
    Therefore, we need to check if they have training in the course.
    The number of rooms reflects the correct assignments.
    """
    check = []
    for index, value in enumerate(i):
        if value == 0:
            continue
        check.append(d[index] in p[value].keys())
    return sum(check)


def measure_satisfaction(i, d, p):
    """
    The satisfaction of the tutor set was modeled using an
    exponential function, which assigns higher value for preference 1
    and lower value for the last course.
    """
    preferences = []
    for index, value in enumerate(i):
        options = p.get(value, {})
        x = options.get(d[index], {})
        if value == 0 or x == {}:
            x = 0.0
        preferences.append(x)
    return sum(preferences)


def evaluate_individual(i, d, p):
    """
    Individual evaluation is a distance function from the origin.
    In this case, we have the number of rooms on the X axis and the satisfaction
    of the tutor set on the Y axis. The goal is to increase values in X and Y.
    Therefore, the higher the value, the better the result. Weight is assigned
    to rooms because this criterion should prevail over tutor satisfaction.
    """
    rooms = len(i) * count_rooms(i, d, p)
    interests = measure_satisfaction(i, d, p)
    return (np.linalg.norm([rooms, interests]),)


def do_the_scheduled(courses, candidates, preferences, da, results):
    """
    Parallelized function that receives processing data and starts a
    genetic algorithm for heuristic search. Each generation will create
    2000 individuals, and at the end, 10% of the most adapted population
    (best evaluated) will be preserved. In 20% of individuals, there will be
    random mutations, understood as shuffling of individual elements (aiming
    to explore the search space).
    """
    population_size = 1000
    n_generations = 200
    preservation = 0.2

    creator.create("FitnessMax", base.Fitness, weights=(1.0,))
    creator.create("Individual", list, fitness=creator.FitnessMax)

    toolbox = base.Toolbox()
    toolbox.register(
        "individual",
        tools.initIterate,
        creator.Individual,
        lambda: create_individual(courses, da),
    )
    toolbox.register("population", tools.initRepeat, list, toolbox.individual)
    toolbox.register(
        "evaluate", lambda ind: evaluate_individual(ind, courses, preferences)
    )
    toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.2)
    toolbox.register("select", tools.selBest)

    pop = toolbox.population(n=population_size)

    for _ in range(n_generations):
        for ind in pop:
            if not ind.fitness.valid:
                ind.fitness.values = toolbox.evaluate(ind)

        elitism = int(preservation * len(pop))
        elite = toolbox.select(pop, elitism)

        offspring = toolbox.clone(pop)
        for mutant in offspring:
            if random.random() < 0.2:
                toolbox.mutate(mutant)
                del mutant.fitness.values

        for ind in offspring:
            if not ind.fitness.valid:
                ind.fitness.values = toolbox.evaluate(ind)

        pop[:] = elite + offspring[: len(pop) - elitism]

    results.put(tools.selBest(pop, 1)[0])


def run(courses, candidates, preferences, da):
    """
    Main function to run the genetic algorithm in parallel and process results.
    Uses multiprocessing to run multiple instances of the algorithm and selects
    the best result among them.
    """
    processes = []
    results = Queue()

    # Parallelize to run n times
    for _ in range(cpu_count()):
        process = Process(
            target=do_the_scheduled,
            args=(courses, candidates, preferences, da, results),
        )
        process.start()
        processes.append(process)

    # Wait for parallel execution to complete
    for process in processes:
        process.join()

    # Select the best result obtained
    better = list()
    old_eval = 0
    while not results.empty():
        res = results.get()
        eval = evaluate_individual(res, courses, preferences)
        if eval[0] > old_eval:
            old_eval = eval[0]
            better = res

    metrics = {
        "best_individual": better,
        "number_classes": count_rooms(better, courses, preferences),
        "satisfaction": measure_satisfaction(better, courses, preferences),
    }

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

    return metrics, result_rows


def process_file(file_path: str, excel_flag: bool) -> pd.DataFrame:
    if excel_flag:
        df = pd.read_excel(file_path)
    else:
        df = pd.read_csv(file_path)

    if "Student ID" not in df.columns:
        raise Exception('Column "Student ID" is required in the tutors table!')

    if "Course Name" not in df.columns:
        raise Exception('Column "Course Name" is required in the tutors table!')

    if "Class Number" not in df.columns:
        raise Exception('Column "Class Number" is required in the tutors table!')

    if "Grade" not in df.columns:
        raise Exception('Column "Grade" is required in the tutors table!')

    if "Preference" not in df.columns:
        raise Exception('Column "Preference" is required in the tutors table!')

    df = df[["Student ID", "Course Name", "Class Number", "Grade", "Preference"]]

    df["Course Name"] = df["Course Name"] + " - Class " + df["Class Number"].astype(str)

    courses = list(df["Course Name"].unique())
    candidates = [i.item() for i in df["Student ID"].unique()]

    preferences = {}
    for candidate in candidates:
        df_filtered = df[df["Student ID"] == candidate].copy().sort_values("Preference")

        preferences[int(candidate)] = {
            row["Course Name"]: row["Grade"] for _, row in df_filtered.iterrows()
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
    if len(sys.argv) < 2:
        result = {"success": False, "error": "No file path provided"}
        sys.stderr.write(json.dumps(result))
        sys.exit(1)

    try:
        excel_path = sys.argv[1]

        excel_flag = True
        if excel_path.endswith(".csv"):
            excel_flag = False

        courses, candidates, preferences, da = process_file(excel_path, excel_flag)
        metrics, result_rows = run(courses, candidates, preferences, da)

        result = {"success": True, "data": {"metrics": metrics, "results": result_rows}}

        sys.stdout.write(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        result = {"success": False, "error": str(e)}
        sys.stderr.write(json.dumps(result))
        sys.exit(1)
