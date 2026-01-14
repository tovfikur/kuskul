# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e6]
      - heading "KusKul" [level=4] [ref=e8]
      - paragraph [ref=e9]: School Management System
    - generic [ref=e11]:
      - heading "Sign in" [level=1] [ref=e12]
      - generic [ref=e13]:
        - generic [ref=e14]:
          - text: Email Address
          - generic [ref=e15]: "*"
        - generic [ref=e16]:
          - textbox "Email Address" [ref=e17]: wrong@example.com
          - group:
            - generic: Email Address *
      - generic [ref=e18]:
        - generic [ref=e19]:
          - text: Password
          - generic [ref=e20]: "*"
        - generic [ref=e21]:
          - textbox "Password" [ref=e22]: wrongpassword
          - group:
            - generic: Password *
      - button "Sign In" [ref=e23] [cursor=pointer]: Sign In
  - alert [ref=e24]:
    - img [ref=e26]
    - generic [ref=e28]: Session expired. Please sign in again.
    - button "Close" [ref=e30] [cursor=pointer]:
      - img [ref=e31]
```