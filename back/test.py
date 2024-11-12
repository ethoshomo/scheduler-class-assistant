import pandas as pd
import sys

print("This is the name of the program: ", sys.argv[0])
print("Argument List: ", str(sys.argv))

file_path = sys.argv[1]
print("File path: ", file_path)

dataframe = pd.read_excel(file_path)

print(dataframe)
