from pathlib import Path
root=Path(__file__).parent
assert not (root/'l4-depth-revisions.tsv').exists(), 'Final .txt drafts contain depth revisions; do not overwrite them with initial .compact drafts.'
for src in root.glob('*.compact'):
 out=[]
 level=int(src.stem.rsplit('__l',1)[1])
 for n,line in enumerate(src.read_text().splitlines(),1):
  if not line.strip(): continue
  if line.startswith('#'):
   fields=line[1:].split('|');topic,p,s,w=fields;continue
  a=line.split('|')
  assert len(a)==(3 if level>=3 else 2),(src,n,a)
  q=a[0];detail=('仮の場面です。'+a[1]) if level>=3 else '-';reason=a[-1]
  out.append('|'.join([topic,q,detail,p if level>=3 else '-',s,w,reason]))
 src.with_suffix('.txt').write_text('\n'.join(out)+'\n')
