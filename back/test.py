import pandas as pd
import sys
import os

print("This is the name of the program: ", sys.argv[0])
print("Argument List: ", str(sys.argv))

file_path = sys.argv[1]
print("File path: ", file_path)

# Get file extension
_, file_extension = os.path.splitext(file_path)
file_extension = file_extension.lower()

# Read file based on extension
if file_extension == ".xlsx":
    dataframe = pd.read_excel(file_path)
elif file_extension == ".csv":
    dataframe = pd.read_csv(file_path)
else:
    print(f"Unsupported file format: {file_extension}")
    print("Supported formats: .xlsx, .csv")
    sys.exit(1)

print(dataframe)
