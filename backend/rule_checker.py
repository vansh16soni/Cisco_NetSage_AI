# rule_checker.py
#
# Pure Python, deterministic validator for Cisco `show` command output.
# No AI involved here on purpose - this is the "ground truth" cross-check.
#
# Usage:
#   from rule_checker import check_show_output, adjust_confidence
#   findings = check_show_output(show_outputs_list)
#

import re

def get_output(show_outputs, pattern):
    regex = re.compile(pattern, re.IGNORECASE)
    for so in show_outputs:
        if regex.search(so.get('command', '')):
            return so.get('output', '')
    return None

def push_finding(findings, finding_type, message, severity='warning'):
    findings.append({
        'type': finding_type,
        'message': message,
        'severity': severity
    })

# --- Individual checks ---

def check_duplicate_ips(show_outputs, findings):
    ip_brief = get_output(show_outputs, r'show ip interface brief') or ''
    arp_table = get_output(show_outputs, r'show ip arp') or ''
    combined = (ip_brief + '\n' + arp_table).strip()
    if not combined:
        return

    ip_regex = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
    seen = {}
    for ip in ip_regex.findall(combined):
        if ip == '0.0.0.0' or ip.endswith('.255') or ip == '255.255.255.255':
            continue
        seen[ip] = seen.get(ip, 0) + 1

    for ip, count in seen.items():
        if count > 1:
            push_finding(
                findings,
                'DUPLICATE_IP',
                f"IP address {ip} appears {count} times across interface/ARP output - possible duplicate IP assignment.",
                'critical'
            )

def check_subnet_masks(show_outputs, findings):
    running_config = get_output(show_outputs, r'show running-config|show run')
    if not running_config:
        return

    mask_regex = re.compile(r'ip address\s+(?:\d{1,3}\.){3}\d{1,3}\s+((?:\d{1,3}\.){3}\d{1,3})', re.IGNORECASE)
    masks_seen = set(mask_regex.findall(running_config))
    if len(masks_seen) > 1:
        push_finding(
            findings,
            'INCONSISTENT_SUBNET_MASK',
            f"Multiple different subnet masks found in config ({', '.join(masks_seen)}) - verify all devices on the same segment use a matching mask.",
            'warning'
        )

def check_gateway_mismatch(show_outputs, findings):
    ip_config_pc = get_output(show_outputs, r'ipconfig|show ip dhcp|pc.*ip')
    running_config = get_output(show_outputs, r'show running-config|show run')
    if not ip_config_pc or not running_config:
        return

    gw_match = re.search(r'Default Gateway.*?:?\s*((?:\d{1,3}\.){3}\d{1,3})', ip_config_pc, re.IGNORECASE)
    if not gw_match:
        return
    pc_gateway = gw_match.group(1)

    svi_match = re.search(
        r'interface\s+Vlan\d+[\s\S]*?ip address\s+((?:\d{1,3}\.){3}\d{1,3})',
        running_config,
        re.IGNORECASE
    )

    if svi_match and svi_match.group(1) != pc_gateway:
        push_finding(
            findings,
            'GATEWAY_MISMATCH',
            f"PC default gateway ({pc_gateway}) does not match the configured SVI/router interface IP ({svi_match.group(1)}).",
            'critical'
        )

def check_interface_down(show_outputs, findings):
    ip_brief = get_output(show_outputs, r'show ip interface brief') or ''
    if_status = get_output(show_outputs, r'show interfaces status|show interfaces') or ''
    combined = (ip_brief + '\n' + if_status).strip()
    if not combined:
        return

    line_regex = re.compile(r'^(\S+)\s+.*?\s(administratively down|down)\s+(down)?', re.IGNORECASE | re.MULTILINE)
    for match in line_regex.finditer(combined):
        iface = match.group(1)
        admin = match.group(2)
        push_finding(
            findings,
            'INTERFACE_DOWN',
            f"Interface {iface} is {admin}{' (shutdown likely applied)' if admin.lower() == 'administratively down' else ''}.",
            'critical'
        )

def check_missing_vlan_assignment(show_outputs, findings):
    vlan_brief = get_output(show_outputs, r'show vlan brief|show vlan')
    running_config = get_output(show_outputs, r'show running-config|show run')
    if not vlan_brief and not running_config:
        return

    source = vlan_brief or running_config
    # Flag ports still sitting in default VLAN 1 alongside evidence other VLANs exist.
    has_other_vlans = bool(re.search(r'\bvlan\s*(?:1[0-9]|[2-9][0-9]|[1-9])\b', source, re.IGNORECASE) and
                           re.search(r'\b(?:10|20|30|99)\b', source))
    vlan1_ports = bool(re.search(r'VLAN0*1\b[\s\S]{0,200}?(?:Fa|Gi)\d/\d+', source, re.IGNORECASE))

    if has_other_vlans and vlan1_ports:
        push_finding(
            findings,
            'MISSING_VLAN_ASSIGNMENT',
            'One or more access ports appear to remain in default VLAN 1 despite other VLANs being defined - check "switchport access vlan" configuration.',
            'warning'
        )

def check_missing_routes(show_outputs, findings):
    route_table = get_output(show_outputs, r'show ip route')
    if not route_table:
        return

    has_default = bool(re.search(r'^(?:S\*|Gateway of last resort)', route_table, re.IGNORECASE | re.MULTILINE) or
                       re.search(r'0\.0\.0\.0/0', route_table))
    has_static = bool(re.search(r'^S\s', route_table, re.MULTILINE))
    mentions_multiple_networks = len(re.findall(r'\b(?:\d{1,3}\.){3}\d{1,3}/\d+\b', route_table))

    if not has_default and not has_static and mentions_multiple_networks <= 2:
        push_finding(
            findings,
            'MISSING_ROUTE',
            'No default route or static route found in "show ip route" output - remote networks may be unreachable.',
            'critical'
        )

def check_acl_nat(show_outputs, findings):
    acl = get_output(show_outputs, r'show access-lists')
    nat = get_output(show_outputs, r'show ip nat translations|show ip nat statistics')
    running_config = get_output(show_outputs, r'show running-config|show run')

    if acl:
        has_implicit_deny_only = bool(re.search(r'deny\s+ip\s+any\s+any', acl, re.IGNORECASE) and not re.search(r'permit', acl, re.IGNORECASE))
        if has_implicit_deny_only:
            push_finding(
                findings,
                'ACL_BLOCKING_ALL',
                'Access list contains a deny-any-any with no visible permit statements - this will block all matched traffic.',
                'critical'
            )

    if nat and re.search(r'0 translations|Total translations: 0', nat, re.IGNORECASE):
        push_finding(
            findings,
            'NAT_NO_TRANSLATIONS',
            'NAT translation table is empty - inside/outside interfaces or NAT ACL may be misconfigured.',
            'warning'
        )

    if running_config and re.search(r'ip nat inside', running_config) and not re.search(r'ip nat outside', running_config):
        push_finding(
            findings,
            'NAT_MISSING_OUTSIDE',
            'Config defines "ip nat inside" but no interface is marked "ip nat outside".',
            'critical'
        )

def check_show_output(show_outputs):
    if not isinstance(show_outputs, list) or len(show_outputs) == 0:
        return []

    findings = []
    check_duplicate_ips(show_outputs, findings)
    check_subnet_masks(show_outputs, findings)
    check_gateway_mismatch(show_outputs, findings)
    check_interface_down(show_outputs, findings)
    check_missing_vlan_assignment(show_outputs, findings)
    check_missing_routes(show_outputs, findings)
    check_acl_nat(show_outputs, findings)

    return findings

def adjust_confidence(ai_confidence, findings):
    if not isinstance(findings, list):
        return ai_confidence

    critical_count = sum(1 for f in findings if f.get('severity') == 'critical')
    warning_count = sum(1 for f in findings if f.get('severity') == 'warning')

    adjusted = ai_confidence
    if critical_count > 0:
        adjusted += 0.1 * min(critical_count, 2)
    elif warning_count > 0:
        adjusted += 0.03 * min(warning_count, 2)
    else:
        adjusted -= 0.05

    return max(0.0, min(1.0, round(adjusted, 2)))
