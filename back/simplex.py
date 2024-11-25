import pandas as pd
from pulp import (
    LpProblem,
    LpMaximize,
    LpVariable,
    lpSum,
    LpBinary,
    PULP_CBC_CMD,
    COIN_CMD,
)
import sys
import json
import os


def get_solver():
    """Get the CBC solver with the correct path based on whether we're running as script or frozen executable"""
    if getattr(sys, "frozen", False):
        # Running as compiled executable
        if sys.platform == "win32":
            possible_paths = [
                os.path.join(sys._MEIPASS, "cbc.exe"),
                os.path.join(os.path.dirname(sys.executable), "cbc.exe"),
            ]
        else:
            possible_paths = [
                os.path.join(sys._MEIPASS, "cbc"),
                os.path.join(os.path.dirname(sys.executable), "cbc"),
            ]

        for path in possible_paths:
            if os.path.exists(path):
                # Create solver with msg=0 to suppress output
                return COIN_CMD(path=path, msg=0)

        # If we get here, try using default solver as fallback
        try:
            return PULP_CBC_CMD(msg=0)  # Suppress output for default solver too
        except:
            paths_str = "\n".join(possible_paths)
            raise Exception(f"CBC solver not found. Searched in:\n{paths_str}")
    else:
        # Running as Python script
        return PULP_CBC_CMD(msg=0)  # Suppress output here too


def process_file(file_path: str, courses_excel_path:str, excel_flag: bool, preference_flag:bool=True) -> pd.DataFrame:
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

    df_courses = df_courses.loc[df_courses.index.repeat(df_courses['Number of Classes'])].reset_index(drop=True)
    df_courses['class_number'] = df_courses.groupby('Course Name').cumcount() + 1
    df_courses = df_courses.drop(columns='Number of Classes')
    
    df = pd.merge(df, df_courses, on='Course Name')
    df['Course Name'] = df['Course Name'] + ' - Class ' + df['class_number'].astype(str)

    # Removendo a coluna auxiliar 'contador', se necessário
    df = df.drop(columns='class_number').drop_duplicates()

    candidates = [i.item() for i in df["Student ID"].unique()]

    preferences = {}
    avarage_grades = {}  # N_aa

    for candidate in candidates:
        df_filtered = df[df["Student ID"] == candidate].copy().sort_values("Preference")

        avarage_grades[candidate] = df_filtered["Grade"].mean()

        preferences[int(candidate)] = {
            row["Course Name"]: row["Grade"] for _, row in df_filtered.iterrows()
        }

    course_candidates = {}

    for candidate in candidates:
        for course in courses:
            if course in preferences[candidate].keys():
                course_candidates[(candidate, course)] = 1
            else:
                course_candidates[(candidate, course)] = 0

    return courses, candidates, preferences, avarage_grades, course_candidates


def run(courses, candidates, preferences, avarage_grades, course_candidates):
    modelo = LpProblem("Alocacao_de_Monitores", LpMaximize)

    # Variaveis de decisao
    x_ad = LpVariable.dicts(
        "x", [(a, d) for a in candidates for d in courses], cat=LpBinary
    )
    y_d = LpVariable.dicts("y", courses, cat=LpBinary)

    # Funcao objetivo
    modelo += lpSum(
        preferences[a][d] * x_ad[(a, d)] for a in candidates for d in courses if d in preferences[a].keys()
    ) - lpSum(y_d[d] for d in courses)

    # Restrições
    # Cada disciplina deve ter no maximo um monitor ou nao ter monitor
    for d in courses:
        modelo += (
            lpSum(x_ad[(a, d)] for a in candidates) + y_d[d] == 1,
            f"Restricao_disciplina_{d}",
        )

    # Cada monitor pode ser alocado a no maximo uma disciplina
    for a in candidates:
        modelo += lpSum(x_ad[(a, d)] for d in courses) <= 1, f"Restricao_monitor_{a}"

    # Um monitor so pode ser alocado a uma disciplina se ele estiver disposto (s_{ad} = 1)
    for a in candidates:
        for d in courses:
            modelo += (
                x_ad[(a, d)] <= course_candidates[(a, d)],
                f"Restricao_disposicao_{a}_{d}",
            )

    # Get the appropriate solver with better error handling
    try:
        solver = get_solver()
        status = modelo.solve(solver)
        if status != 1:  # 1 means optimal solution found
            raise Exception(f"Solver status: {LpProblem.status[modelo.status]}")
    except Exception as e:
        raise Exception(f"Error solving model: {str(e)}")

    metrics = {
        "objective_function_value": modelo.objective.value(),
        "soluction_status": modelo.status,
    }

    result_rows = []

    # Monitores alocados
    alocacoes = []
    for a in candidates:
        for d in courses:
            if x_ad[(a, d)].varValue == 1:
                alocacoes.append(
                    (a, d, preferences.get(a, {}).get(d, {}), preferences.get(a, {}))
                )
    for aloc in alocacoes:
        result_rows.append(
            {
                "class": aloc[1],
                "student": str(aloc[0]),
                "grade": aloc[2],
                "preference": aloc[3],
            }
        )

    # Disciplinas sem monitores
    disciplinas_sem_monitor = [d for d in courses if y_d[d].varValue == 1]

    for d in disciplinas_sem_monitor:
        result_rows.append(
            {
                "class": d,
                "student": "No tutor",
                "grade": "No preference",
                "preference": "No preference",
            }
        )

    return metrics, result_rows


if __name__ == "__main__":
    if len(sys.argv) < 3:
        result = {"success": False, "error": "No file path provided"}
        sys.stderr.write(json.dumps(result))
        sys.exit(1)

    try:
        # Redirect stdout to devnull during computation to suppress CBC output
        original_stdout = sys.stdout
        sys.stdout = open(os.devnull, "w")

        students_excel_path = sys.argv[1]
        courses_excel_path = sys.argv[2]

        excel_flag = True
        if students_excel_path.endswith(".csv"):
            excel_flag = False

        courses, candidates, preferences, avarage_grades, course_candidates = (
            process_file(students_excel_path, courses_excel_path, excel_flag)
        )
        metrics, result_rows = run(
            courses, candidates, preferences, avarage_grades, course_candidates
        )
        
        # Restore stdout before writing our result
        sys.stdout = original_stdout

        result = {"success": True, "data": {"metrics": metrics, "results": result_rows}}
        sys.stdout.write(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        # Restore stdout in case of error too
        if "original_stdout" in locals():
            sys.stdout = original_stdout

        result = {"success": False, "error": str(e)}
        sys.stderr.write(json.dumps(result))
        sys.exit(1)
