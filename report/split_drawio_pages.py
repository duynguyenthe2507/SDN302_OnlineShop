from pathlib import Path
from xml.etree import ElementTree as ET

source = Path(__file__).parent / 'diagrams' / 'Online_Shop_Diagrams.drawio'
out_dir = source.parent / 'tung_so_do'
out_dir.mkdir(parents=True, exist_ok=True)
root = ET.parse(source).getroot()
stems = [
    '01_use_case_customer', '02_use_case_admin', '03_context_diagram',
    '04_sequence_login', '05_sequence_checkout', '06_sequence_purchase_payment',
    '07_sequence_admin_cancel'
]
for diagram, slug in zip(root.findall('diagram'), stems):
    file_root = ET.Element('mxfile', {
        'host': root.get('host', 'app.diagrams.net'),
        'modified': root.get('modified', ''),
        'agent': root.get('agent', 'Codex'),
        'version': root.get('version', ''),
        'type': 'device'
    })
    file_root.append(diagram)
    ET.indent(file_root, space='  ')
    ET.ElementTree(file_root).write(out_dir / f'{slug}.drawio', encoding='utf-8', xml_declaration=True)
print(out_dir)
print('\n'.join(p.name for p in sorted(out_dir.glob('*.drawio'))))
