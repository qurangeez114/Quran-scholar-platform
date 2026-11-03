import re,os,time,subprocess
C=['bukhari','muslim','nasai','abudawud','tirmidhi','ibnmajah','malik','riyadussalihin','nawawi40']
def get(url,path):
    if os.path.exists(path) and os.path.getsize(path)>5000: return open(path,encoding='utf8',errors='ignore').read()
    for a in range(3):
        subprocess.run(['curl','-sL','-A','Mozilla/5.0','--max-time','60',url,'-o',path]); time.sleep(0.4)
        if os.path.exists(path) and os.path.getsize(path)>5000: break
    return open(path,encoding='utf8',errors='ignore').read() if os.path.exists(path) else ''
for c in C:
    idx=get(f'https://sunnah.com/{c}',f'books/{c}_index.html')
    books=sorted(set(re.findall(rf'href="/{c}/([0-9a-z]+)"',idx)),key=lambda x:(len(x),x))
    print(c,len(books),books[:5],flush=True)
    if c=='nawawi40': books=['']
    for b in books:
        get(f'https://sunnah.com/{c}/{b}' if b else f'https://sunnah.com/{c}',f'books/{c}_{b or "all"}.html')
