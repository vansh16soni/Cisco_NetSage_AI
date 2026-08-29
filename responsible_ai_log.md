# NetSage AI - Responsible AI Review Log
This log documents 5 network troubleshooting cases where the NetSage AI diagnosis was corrected or rejected by a human reviewer. These corrections demonstrate the necessity of a "Human-in-the-Loop" review process for network automation tasks.

---

### Case 1: VLAN 30 Access Port Left in Default VLAN
* **Symptom**: PC1 on Fa0/5 cannot reach the file server in VLAN 30. It gets an IP but no connectivity.
* **Original AI Output**:
  - **Identified Root Cause**: "Layer 3 routing failure. The Core Router R1 is not routing packets between VLAN 10 and VLAN 30 because the subinterfaces are down."
  - **OSI Layer**: Layer 3
  - **Recommended Fix**: "Check subinterface status on R1 using 'show ip interface brief' and run 'no shutdown'."
* **Human Review Action**: **Edited**
* **Corrected Human Version**:
  - **Corrected Root Cause**: "Fa0/5 is still assigned to default VLAN 1 instead of VLAN 30. SW1 switchport is misconfigured at Layer 2."
  - **OSI Layer**: Layer 2
  - **Corrected Fix**: "Run 'interface Fa0/5' then 'switchport access vlan 30' on switch SW1."
* **Reason for Correction**: AI hallucinated a Layer 3 routing issue on the router, ignoring clear Layer 2 output from `show vlan brief` which showed port `Fa0/5` still assigned to default VLAN 1.

---

### Case 2: Trunk Link Mismatch on SW2
* **Symptom**: Devices in VLAN 20 on SW2 cannot reach VLAN 20 devices on SW1 across the trunk.
* **Original AI Output**:
  - **Identified Root Cause**: "Duplex mismatch on Gi0/1 between SW1 and SW2 causing packet collisions."
  - **OSI Layer**: Layer 1
  - **Recommended Fix**: "Configure both SW1 Gi0/1 and SW2 Gi0/1 to 'duplex full' and speed 1000."
* **Human Review Action**: **Edited**
* **Corrected Human Version**:
  - **Corrected Root Cause**: "VLAN 20 is not included in the trunk allowed VLAN list on SW1 Gi0/1."
  - **OSI Layer**: Layer 2
  - **Corrected Fix**: "Run 'switchport trunk allowed vlan add 20' on SW1 Gi0/1 trunk interface."
* **Reason for Correction**: AI suggested a duplex mismatch when `show interfaces trunk` explicitly listed only `1,10,30` allowed, thereby excluding VLAN 20. The interface status was up, ruling out physical/duplex issues.

---

### Case 3: Gateway IP Mismatch after SVI Renumbering
* **Symptom**: All PCs in VLAN 20 lost Internet and inter-VLAN access after a network address change.
* **Original AI Output**:
  - **Identified Root Cause**: "Local PC NIC driver failure or bad Ethernet cable on PC clients in VLAN 20."
  - **OSI Layer**: Layer 1
  - **Recommended Fix**: "Instruct users to replace their Ethernet patch cables and update network interface card drivers."
* **Human Review Action**: **Rejected**
* **Corrected Human Version**:
  - **Corrected Root Cause**: "Gateway IP mismatch. The SVI for VLAN 20 was renumbered to 192.168.21.1/24, but the static IP configuration on the PC is still referencing the old gateway 192.168.20.1."
  - **OSI Layer**: Layer 3
  - **Corrected Fix**: "Update static gateway IP on VLAN 20 PCs to the new SVI address 192.168.21.1."
* **Reason for Correction**: AI recommended physical replacement of user cables, failing to recognize that SVI renumbering was documented in `show running-config interface Vlan20` and didn't match the PC's default gateway.

---

### Case 4: OSPF Neighbor Stuck in EXSTART
* **Symptom**: R1 and R2 form an OSPF adjacency that never progresses past EXSTART.
* **Original AI Output**:
  - **Identified Root Cause**: "OSPF hello interval mismatch between R1 and R2 routers."
  - **OSI Layer**: Layer 3
  - **Recommended Fix**: "Change OSPF hello timer using 'ip ospf hello-interval 10' on both Serial0/0/0 interfaces."
* **Human Review Action**: **Edited**
* **Corrected Human Version**:
  - **Corrected Root Cause**: "MTU mismatch on Serial0/0/0 (1500 bytes on R1 vs 1400 bytes on R2) prevents exchange of Database Description (DBD) packets."
  - **OSI Layer**: Layer 3
  - **Corrected Fix**: "Set matching MTU on R2 Serial0/0/0 via 'ip mtu 1500' and clear the OSPF process."
* **Reason for Correction**: OSPF hello intervals mismatch would prevent the state from even reaching EXSTART (stuck in DOWN or INIT). The EXSTART status indicates hellos *are* exchanged, but database exchange fails due to MTU size mismatch shown in interfaces output.

---

### Case 5: NAT Overload Missing Outside Interface
* **Symptom**: Internal PCs cannot reach the Internet; translation table is empty.
* **Original AI Output**:
  - **Identified Root Cause**: "Access control list NAT_ACL is blocking traffic because of a deny statement."
  - **OSI Layer**: Layer 3/4
  - **Recommended Fix**: "Modify NAT_ACL standard access-list to permit any source IP."
* **Human Review Action**: **Edited**
* **Corrected Human Version**:
  - **Corrected Root Cause**: "The external WAN interface Serial0/0/0 is missing the 'ip nat outside' designation."
  - **OSI Layer**: Layer 3
  - **Corrected Fix**: "Configure 'interface Serial0/0/0' then 'ip nat outside' on R1."
* **Reason for Correction**: Standard NAT ACLs do not block LAN traffic by default; rather, they define traffic to be translated. The real issue is the complete lack of `ip nat outside` on the Serial interface configuration, which stops translation from triggering.
