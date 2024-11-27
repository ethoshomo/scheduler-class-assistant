all: genetic.py linear.py build_executables.py
	python build_executables.py

genetic: genetic.py build_executables.py
	python build_executables.py --genetic

linear: linear.py build_executables.py
	python build_executables.py --linear

reqs:
	pip freeze > requirements.txt
