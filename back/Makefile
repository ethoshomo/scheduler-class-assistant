all: genetic.py integer_programming.py build_executables.py
	python build_executables.py

genetic: genetic.py build_executables.py
	python build_executables.py --genetic

integer_programming: integer_programming.py build_executables.py
	python build_executables.py --integer_programming

reqs:
	pip freeze > requirements.txt
