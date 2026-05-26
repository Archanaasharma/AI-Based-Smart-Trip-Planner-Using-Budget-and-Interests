import google.generativeai as genai

api_key= "AIzaSyDn2jgY4qtOI1U5uXmaW8oZnBZIEbJGvpc"
genai.configure(api_key=api_key)
print("checking available models:...\n")
valid_models=[]
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            model_name=m.name.replace('models/','')
            print(f"available:{model_name}")
            valid_models.append(model_name)
    print(f"total working models:{len(valid_models)}")
except Exception as e:
    print("error",e)
