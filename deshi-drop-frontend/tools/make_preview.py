# Builds a single-file preview (offline demo) -> argv[1]
import re,base64,sys,mimetypes,os
h=open('index.html',encoding='utf8').read()
h=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>','',h)
h=re.sub(r'<link rel="(manifest|canonical)"[^>]*>','',h)
def data(p):
    m=mimetypes.guess_type(p)[0] or 'application/octet-stream'
    return 'data:%s;base64,%s'%(m,base64.b64encode(open(p,'rb').read()).decode())
h=re.sub(r'<link rel="stylesheet" href="([^"?]+)[^"]*">',lambda m:'<style>'+re.sub(r"url\(['\"]?(?!data:|http)([^)'\"]+)['\"]?\)",lambda u:'url(%s)'%data(os.path.join(os.path.dirname(m.group(1)),u.group(1))) if os.path.exists(os.path.join(os.path.dirname(m.group(1)),u.group(1))) else u.group(0),open(m.group(1),encoding='utf8').read())+'</style>',h)
def scr(m):
    p=m.group(1); s=open(p,encoding='utf8').read()
    if p=='js/quran.js': s=open('js/quran-data.js',encoding='utf8').read()+'\n'+s
    s=s.replace("'gallery/price-list.jpg'","'%s'"%data('gallery/price-list.jpg'))
    s=re.sub(r"(['\"])(img/[\w./-]+\.(?:jpg|png))\1",lambda u:u.group(1)+data(u.group(2))+u.group(1),s)
    return '<script>'+s.replace('</script','<\\/script')+'</script>'
h=re.sub(r'<script src="([^"?]+)[^"]*"></script>',scr,h)
h=re.sub(r'(src|href)="(img/[^"]+)"',lambda m:'%s="%s"'%(m.group(1),data(m.group(2))),h)
open(sys.argv[1],'w',encoding='utf8').write(h)
print(len(h)//1024,'KB')
