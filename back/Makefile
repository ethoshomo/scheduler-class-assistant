all: genetic.py simplex.py build_executables.py
	python build_executables.py

genetic: genetic.py build_executables.py
	python build_executables.py --genetic

simplex: simplex.py build_executables.py
	python build_executables.py --simplex

reqs:
	pip freeze > requirements.txt
