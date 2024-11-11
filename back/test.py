import pandas as pd
import sys

print("This is the name of the program: ", sys.argv[0])
print("Argument List: ", str(sys.argv))

file_name = sys.argv[1]
print("File name: ", file_name)

dataframe = pd.read_excel(file_name)

print(dataframe)
