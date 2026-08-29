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


if __name__ == "__main__":
    print("==================================================")
    print("NetSage AI - Rule Checker Deterministic Test Run")
    print("==================================================")
    
    # Sample Case 1: Interface Down & Duplicate IP
    sample_outputs_1 = [
        {
            "command": "show ip interface brief",
            "output": """
Interface              IP-Address      OK? Method Status                Protocol
FastEthernet0/1        192.168.1.1     YES manual up                    up      
FastEthernet0/5        192.168.1.1     YES manual administratively down down    
FastEthernet0/6        unassigned      YES unset  down                  down    
"""
        },
        {
            "command": "show ip arp",
            "output": """
Protocol  Address          Age (min)  Hardware Addr   Type   Interface
Internet  192.168.1.1             -   0001.c789.1111  ARPA   FastEthernet0/1
Internet  192.168.1.1             5   0002.5555.2222  ARPA   FastEthernet0/1
"""
        }
    ]
    
    # Sample Case 2: Gateway Mismatch & Subnet Mask Inconsistency
    sample_outputs_2 = [
        {
            "command": "ipconfig",
            "output": """
Windows IP Configuration
   Ethernet adapter Ethernet0:
      Connection-specific DNS Suffix  . :
      Link-local IPv6 Address . . . . . : fe80::d9a0:1b2c:3d4e:5f6a%4
      IPv4 Address. . . . . . . . . . . : 192.168.20.50
      Subnet Mask . . . . . . . . . . . : 255.255.255.0
      Default Gateway . . . . . . . . . : 192.168.20.1
"""
        },
        {
            "command": "show running-config",
            "output": """
Building configuration...
Current configuration : 1045 bytes
!
interface Vlan20
 ip address 192.168.21.1 255.255.255.0
!
interface Vlan10
 ip address 192.168.10.1 255.255.254.0
!
"""
        }
    ]

    # Sample Case 3: NAT missing outside interface & empty translations
    sample_outputs_3 = [
        {
            "command": "show ip nat translations",
            "output": "Total translations: 0 (0 static, 0 dynamic; 0 extended)"
        },
        {
            "command": "show running-config",
            "output": """
interface GigabitEthernet0/0
 ip nat inside
!
interface Serial0/0/0
!
ip nat inside source list 1 interface Serial0/0/0 overload
"""
        }
    ]

    print("\n--- Running checks on Sample Case 1 (Interface Down & Duplicate IP) ---")
    findings_1 = check_show_output(sample_outputs_1)
    for f in findings_1:
        print(f"[{f['severity'].upper()}] {f['type']}: {f['message']}")
        
    print("\n--- Running checks on Sample Case 2 (Gateway Mismatch & Inconsistent Masks) ---")
    findings_2 = check_show_output(sample_outputs_2)
    for f in findings_2:
        print(f"[{f['severity'].upper()}] {f['type']}: {f['message']}")

    print("\n--- Running checks on Sample Case 3 (NAT Missing Outside / Empty translations) ---")
    findings_3 = check_show_output(sample_outputs_3)
    for f in findings_3:
        print(f"[{f['severity'].upper()}] {f['type']}: {f['message']}")

    print("\n--- Testing Confidence Adjustment ---")
    base_conf = 0.80
    adj_conf_1 = adjust_confidence(base_conf, findings_1)
    adj_conf_2 = adjust_confidence(base_conf, findings_2)
    adj_conf_3 = adjust_confidence(base_conf, findings_3)
    print(f"Base confidence: {base_conf}")
    print(f"Case 1 (2 critical findings) Adjusted Confidence: {adj_conf_1} (+0.20 due to corroborating critical warnings)")
    print(f"Case 2 (1 critical, 1 warning) Adjusted Confidence: {adj_conf_2} (+0.10 due to critical gateway warning)")
    print(f"Case 3 (1 critical, 1 warning) Adjusted Confidence: {adj_conf_3} (+0.10 due to critical NAT outside warning)")
\n\n# ==================================================\n# SAMPLE OUTPUT:\n# ==================================================\n# ==================================================\n# NetSage AI - Rule Checker Deterministic Test Run\n# ==================================================\n# \n# --- Running checks on Sample Case 1 (Interface Down & Duplicate IP) ---\n# [CRITICAL] DUPLICATE_IP: IP address 192.168.1.1 appears 4 times across interface/ARP output - possible duplicate IP assignment.\n# [CRITICAL] INTERFACE_DOWN: Interface FastEthernet0/5 is administratively down (shutdown likely applied).\n# [CRITICAL] INTERFACE_DOWN: Interface FastEthernet0/6 is down.\n# \n# --- Running checks on Sample Case 2 (Gateway Mismatch & Inconsistent Masks) ---\n# [WARNING] INCONSISTENT_SUBNET_MASK: Multiple different subnet masks found in config (255.255.254.0, 255.255.255.0) - verify all devices on the same segment use a matching mask.\n# [CRITICAL] GATEWAY_MISMATCH: PC default gateway (192.168.20.1) does not match the configured SVI/router interface IP (192.168.21.1).\n# \n# --- Running checks on Sample Case 3 (NAT Missing Outside / Empty translations) ---\n# [WARNING] NAT_NO_TRANSLATIONS: NAT translation table is empty - inside/outside interfaces or NAT ACL may be misconfigured.\n# [CRITICAL] NAT_MISSING_OUTSIDE: Config defines "ip nat inside" but no interface is marked "ip nat outside".\n# \n# --- Testing Confidence Adjustment ---\n# Base confidence: 0.8\n# Case 1 (2 critical findings) Adjusted Confidence: 1.0 (+0.20 due to corroborating critical warnings)\n# Case 2 (1 critical, 1 warning) Adjusted Confidence: 0.9 (+0.10 due to critical gateway warning)\n# Case 3 (1 critical, 1 warning) Adjusted Confidence: 0.9 (+0.10 due to critical NAT outside warning)\n