import pandas as pd
from pulp import LpProblem, LpMaximize, LpVariable, lpSum, LpBinary, PULP_CBC_CMD
import sys
import json

def process_file(file_path: str, courses:list[str], excel_flag: bool) -> pd.DataFrame:
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

    df = df[["Student ID", "Course Name", "Class Number", "Grade", "Preference"]]

    candidates = [i.item() for i in df["Student ID"].unique()]

    preferences = {}
    avarage_grades = {} # N_aa

    for candidate in candidates:
        df_filtered = df[df["Student ID"] == candidate].copy().sort_values("Preference")

        avarage_grades[candidate] = df_filtered['Grade'].mean()

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


    return candidates, preferences, avarage_grades, course_candidates

def run(courses, candidates, preferences, avarage_grades, course_candidates):
    modelo = LpProblem("Alocacao_de_Monitores", LpMaximize)

    # Variaveis de decisao
    x_ad = LpVariable.dicts("x", [(a, d) for a in candidates for d in courses], cat=LpBinary)
    y_d = LpVariable.dicts("y", courses, cat=LpBinary)

    # Funcao objetivo
    modelo += lpSum(avarage_grades[a] * x_ad[(a, d)] for a in candidates for d in courses) - lpSum(y_d[d] for d in courses)

    '''
    Restrições
    '''

    # Cada disciplina deve ter no maximo um monitor ou nao ter monitor
    for d in courses:
        modelo += lpSum(x_ad[(a, d)] for a in candidates) + y_d[d] == 1, f"Restricao_disciplina_{d}"

    # Cada monitor pode ser alocado a no maximo uma disciplina
    for a in candidates:
        modelo += lpSum(x_ad[(a, d)] for d in courses) <= 1, f"Restricao_monitor_{a}"

    # Um monitor so pode ser alocado a uma disciplina se ele estiver disposto (s_{ad} = 1)
    for a in candidates:
        for d in courses:
            modelo += x_ad[(a, d)] <= course_candidates[(a, d)], f"Restricao_disposicao_{a}_{d}"

    '''
    Resultado
    '''

    solver = PULP_CBC_CMD(msg=True)
    modelo.solve(solver)

    metrics = {
        "objective_function_value": modelo.objective.value(),
        "soluction_status": modelo.status
    }

    result_rows = []

    # Monitores alocados
    alocacoes = []
    for a in candidates:
        for d in courses:
            if x_ad[(a, d)].varValue == 1:
                alocacoes.append((a, d, preferences.get(a, {}).get(d, {}), preferences.get(a, {})))
    for aloc in alocacoes:
        result_rows.append(
            {
                "class": aloc[1],
                "student": str(aloc[0]),
                "grade": aloc[2],
                "preference": aloc[3]
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
                "preference": "No preference"
            }
        )

    return metrics, result_rows

def read_courses_excel(excel_path:str):
    df_courses = pd.read_excel(excel_path)

    courses = []

    for _, row in df_courses.iterrows():
        course = row['Course Name']
        n = row['Number of Classes']

        for i in range(n):
            courses.append(f'{course} - Turma {i + 1}')

    return courses

if __name__ == "__main__":
    if len(sys.argv) < 3:
        result = {"success": False, "error": "No file path provided"}
        sys.stderr.write(json.dumps(result))
        sys.exit(1)

    try:
        excel_path = sys.argv[1]
        courses = read_courses_excel(sys.argv[2])

        excel_flag = True
        if excel_path.endswith(".csv"):
            excel_flag = False

        candidates, preferences, avarage_grades, course_candidates = process_file(excel_path, courses, excel_flag)
        metrics, result_rows = run(courses, candidates, preferences, avarage_grades, course_candidates)

        result = {"success": True, "data": {"metrics": metrics, "results": result_rows}}

        sys.stdout.write(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        result = {"success": False, "error": str(e)}
        sys.stderr.write(json.dumps(result))
        sys.exit(1)