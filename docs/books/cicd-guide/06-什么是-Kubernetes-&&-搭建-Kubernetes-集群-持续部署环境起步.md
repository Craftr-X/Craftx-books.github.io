## 什么是 Kubernetes？

百科上是这样解释的：

> Kubernetes 是 Google 开源的一个容器编排引擎，它支持自动化部署、大规模可伸缩、应用容器化管理。在生产环境中部署一个应用程序时，通常要部署该应用的多个实例以便对应用请求进行负载均衡。

通俗些讲，可以将 `Kubernetes` 看作是用来是一个部署镜像的平台。可以用来操作多台机器调度部署镜像，大大地降低了运维成本。

那么， `Kubernetes` 和 `Docker` 的关系又是怎样的呢？

**一个形象的比喻：如果你将 `docker` 看作是飞机，那么 `kubernetes` 就是飞机场。在飞机场的加持下，飞机可以根据机场调度选择在合适的时间降落或起飞。**

在 `Kubernetes` 中，可以使用集群来组织服务器的。集群中会存在一个 `Master` 节点，该节点是 `Kubernetes` 集群的控制节点，负责调度集群中其他服务器的资源。其他节点被称为 `Node` ， `Node` 可以是物理机也可以是虚拟机。

## 基础安装

**基础安装章节，Master & Node 节点都需要安装**

第一步我们安装些必备组件。 `vim` 是 `Linux` 下的一个文件编辑器； `wget` 可以用作文件下载使用； `ntpdate` 则是可以用来同步时区：

```shell
yum install vim wget ntpdate -y
```

接着我们关闭防火墙。因为 **kubernetes 会创建防火墙规则，导致防火墙规则重复**。所以这里我们要将防火墙关闭：

```shell
systemctl stop firewalld & systemctl disable firewalld
```

这一步需要我们关闭 `Swap` 分区。 `Swap` 是 `Linux` 的交换分区，在系统资源不足时，`Swap` 分区会启用。这操作会拖慢我们的应用性能。

应该让新创建的服务自动调度到集群的其他 `Node` 节点中去，而不是使用 `Swap` 分区。这里我们将它关闭掉：

```shell
#临时关闭
swapoff -a
# 永久关闭
vi /etc/fstab
```

找到 `/etc/fstab` 文件，注释掉下面这一行：

```shell
/dev/mapper/centos-swap swap ...
```

继续关闭 `Selinux`。这是为了支持容器可以访问宿主机文件系统所做的，后续也许会优化掉：

```shell
# 暂时关闭 selinux
setenforce 0
```

```shell
# 永久关闭
vi /etc/sysconfig/selinux
# 修改以下参数，设置为disable
SELINUX=disabled
```

> **关于为什么关闭防火墙，selinux，swap。这里有几份更标准的回答：**[**https://www.zhihu.com/question/374752553**](https://www.zhihu.com/question/374752553)

接着使用 `ntpdate` 来统一我们的系统时间和时区，服务器时间与阿里云服务器对齐。

```shell
# 统一时区，为上海时区
ln -snf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
bash -c "echo 'Asia/Shanghai' > /etc/timezone"

# 统一使用阿里服务器进行时间更新
ntpdate ntp1.aliyun.com
```

### 安装 Docker

在 `kubernetes` 中的组件，服务都可以 `Docker` 镜像方式部署的。所以我们安装 `Docker` 必不可少。

在安装 `Docker` 之前，需要安装 `device-mapper-persistent-data` 和 `lvm2` 两个依赖。我们使用 `Yum` 命令直接安装依赖即可：

```shell
yum install -y yum-utils device-mapper-persistent-data lvm2
```

> device-mapper-persistent-data: 存储驱动，Linux上的许多高级卷管理技术
> lvm: 逻辑卷管理器，用于创建逻辑磁盘分区使用

接下来，添加阿里云的 `Docker` 镜像源，加速 `Docker` 的安装：

```shell
sudo yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
yum install docker-ce -y
```

我们还需要修改一下docker的`cgroupdriver`为`systemd`，这样做是为了避免后面与k8s的冲突。

```shell
cat > /etc/docker/daemon.json <<EOF
{
  "exec-opts": ["native.cgroupdriver=systemd"]
}
EOF
```

安装完毕后，我们使用使用 `systemctl` 启动 `Docker` 即可

```shell
systemctl start docker
systemctl enable docker
```

执行 `docker -v` ，如果显示以下 `docker` 版本的信息，代表 `docker` 安装成功。

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/222a2a0b50414b77909cfde5050373dc~tplv-k3u1fbpfcp-zoom-1.image)

我们拉取 `Docker` 镜像时，一般默认会去 `Docker` 官方源拉取镜像。但是国内出海网速实在是太慢，所以我们更换为 `阿里云镜像仓库` 源进行镜像下载加速

登录阿里云官网，打开 [阿里云容器镜像服务](https://cr.console.aliyun.com)。点击左侧菜单最下面的 `镜像加速器` ，选择 `Centos` （如下图）
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4b0ba7bb836e4ead8aef34a0ac29166d~tplv-k3u1fbpfcp-zoom-1.image)
按照官网的提示，执行命令，即可实现更换 `Docker` 镜像源地址。

还记得我们前面安装私有镜像库时的使用提示吗？在安装完 `Docker` 后，**如果你的私有镜像库是 HTTP 而不是 HTTPS的话，需要在**`/etc/docker/daemon.json` **里配置一下你的私有库地址。**

编辑 `/etc/docker/daemon.json` 文件，添加 `insecure-registries` 字段。字段的值是数组，数组的第一项填入你的私有库地址即可（不要忘记后面的逗号）。如示例：

```json
{
  "insecure-registries": ["http://[私有库地址]:[私有库端口]"],
  "registry-mirrors": ["https://*****.mirror.aliyuncs.com"]
}
```

保存后退出，重启下 `Docker` 服务：

```json
sudo systemctl daemon-reload
sudo systemctl restart docker.service
```

### 安装 Kubernetes 组件

从这里我们开始安装 `Kubernetes` 的相关组件，首先先将安装源更换为为国内的阿里云源：

```shell
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=http://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=0
repo_gpgcheck=0
gpgkey=http://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg
        http://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF
```

接着直接使用 `yum` 命令安装 `kubelet`、 `kubeadm`、`kubectl` 即可，安装完毕后启用 `kubelet` 即可。

```shell
yum install -y kubelet-1.23.6 kubeadm-1.23.6 kubectl-1.23.6
# 启动kubelet
systemctl enable kubelet && systemctl start kubelet
```

> `kubelet` 是 `Kubernetes` 中的核心组件。它会运行在集群的所有节点上，并负责创建启动服务容器
> `kubectl` 则是Kubernetes的命令行工具。可以用来管理，删除，创建资源
> `kubeadm`  则是用来初始化集群，子节点加入的工具。

---

## Master 节点安装

Master 节点是集群内的调度和主要节点，**以下部分仅限 Master 节点才能安装。**

首先，我们使用 `hostnamectl` 来修改主机名称为 `master` 。`hostnamectl` 是 `Centos7` 出的新命令，可以用来修改主机名称：

```shell
hostnamectl set-hostname  master
```

接着使用 `ip addr` 命令，获取本机IP，将其添加到 `/etc/hosts` 内：

```shell
# xxx.xxx.xxx.xxx master
vim /etc/hosts
```

### 配置 Kubernetes 初始化文件

接着我们使用 `kubeadm config print init-defaults` 输出一份默认初始化配置文件，使用 `>` 操作符即可导出为一份文件，方便我们进行修改。

```shell
kubeadm config print init-defaults > init-kubeadm.conf
vim init-kubeadm.conf
```

主要对配置文件做这几件事情：

- 更换 `Kubernetes` 镜像仓库为阿里云镜像仓库，加速组件拉取
- 替换 `ip` 为自己主机 `ip`
- 配置 `pod` 网络为 `flannel` 网段

```shell
# imageRepository: k8s.gcr.io 更换k8s镜像仓库
imageRepository: registry.cn-hangzhou.aliyuncs.com/google_containers
# localAPIEndpointc，advertiseAddress为master-ip ，port默认不修改
localAPIEndpoint:
  advertiseAddress: 192.168.56.101  # 此处为master的IP
  bindPort: 6443
# 配置子网络
networking:
  dnsDomain: cluster.local
  serviceSubnet: 10.96.0.0/12
  podSubnet: 10.244.0.0/16 # 添加这个
```

在修改完配置文件后，我们需要使用 `kubeadm` 拉取我们的默认组件镜像。直接使用 `kubeadm config images pull` 命令即可

```shell
kubeadm config images pull --config init-kubeadm.conf
```

### 初始化 Kubernetes

在镜像拉取后，我们就可以使用刚才编辑好的配置文件去初始化 `Kubernetes` 集群了。这里直接使用 `kubeadm init` 命令去初始化即可。

```shell
kubeadm init --config init-kubeadm.conf
```

在静等运行一会后，终端会给出以下提示：
![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/db8feb814d8549478e7589862b0a9e50~tplv-k3u1fbpfcp-zoom-1.image)

其中，红框命令为在 `Master` 节点需要执行的初始化命令，其作用为将默认的 `Kubernetes` 认证文件拷贝进 `.kube` 文件夹内，才能默认使用该配置文件。

蓝框为需要在 `node` 节点执行的命令。作用是可以快速将 `Node` 节点加入到 `Master` 集群内。

### 安装 Flannel

前面我们在配置文件中，有提到过配置**Pod子网络，**`Flannel` 主要的作用就是如此。**它的主要作用是通过创建一个虚拟网络，让不同节点下的服务有着全局唯一的IP地址，且服务之前可以互相访问和连接。**

那么 `Flannel` 作为 `Kubernetes` 的一个组件，则使用 `Kubernetes` 部署服务的方式进行安装。首先下载配置文件：

```shell
wget https://raw.githubusercontent.com/coreos/flannel/v0.18.1/Documentation/kube-flannel.yml
```

> 在这里，如果提示你 raw.githubusercontent.com 无法访问或连接超时，可以尝试以下办法：
>
> 1. 去 [https://githubusercontent.com.ipaddress.com/raw.githubusercontent.com](https://githubusercontent.com.ipaddress.com/raw.githubusercontent.com) 获取新的IP
> 1. 编辑 hosts 文件，将获取的新IP直接映射到域名上

接着我们手动拉取下 `flannel` 镜像。找到编写镜像名称和版本的地方，使用 `docker pull` 手动拉取一下镜像：

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a9845d5d48e9482d9cd2d8fe39d6a159~tplv-k3u1fbpfcp-zoom-1.image)

```shell
docker pull quay.io/coreos/flannel:v0.13.0-rc2
```

等待镜像拉取结束后，可以使用 `kubectl apply` 命令加载下服务。

```shell
kubectl apply -f kube-flannel.yml
```

### 查看启动情况

在大约稍后1分钟左右，我们可以使用 `kubectl get nodes` 命令查看节点的运行状态。如果 `STATUS = ready`，则代表启动成功。

```shell
kubectl get nodes
```

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f34db98ce655498f859569afce848c14~tplv-k3u1fbpfcp-zoom-1.image)

## Node节点配置

**在安装 `Node` 节点前，我们仍然需要操作一遍上面的 `基础安装`**。 `Node` 节点的地位则是负责运行服务容器，负责接收调度的。

首先第一步，还是需要先设置一下 `hostname` 为 `node1` 。在 `node` 机器上执行：

```shell
hostnamectl set-hostname node1
```

### 拷贝 Master 节点配置文件

接着将 `master` 节点的配置文件拷贝 `k8s` 到 `node` 节点。回到在 `master` 节点，使用 `scp` 命令通过 `SSH`传送文件：

```shell
scp $HOME/.kube/config root@node的ip:~/
```

随后在 `node` 节点执行以下命令，归档配置文件：

```shell
mkdir -p $HOME/.kube
sudo mv $HOME/config $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

### 加入 Master 节点

我们直接使用刚才在 `master` 生成的节点加入命令，在 `node` 机器上执行。让 `Node` 节点加入到 `master` 集群内：

```shell
# 这是一条是示例命令！！！！！！
kubeadm join 172.16.81.164:6443 --token abcdef.0123456789abcdef \
    --discovery-token-ca-cert-hash sha256:b4a059eeffa2e52f2eea7a5d592be10c994c7715c17bda57bbc3757d4f13903d
```

如果刚才的命令丢了，可以在 `master` 机器上使用 `kubeadm token create` 重新生成一条命令：

```shell
kubeadm token create --print-join-command
```

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9b71c8a1c2734e2ba87867270357302d~tplv-k3u1fbpfcp-zoom-1.image)

### 安装 Flannel

**这里和 Master 安装执行方式一样，参考同上。**

## 结束语

在本章，我们从 `0-1` 部署了一套 `Kubernetes` 集群。在下一章，我们将在集群内运行我们的第一个应用。加油 💪

如果你有疑问，欢迎在评论区留言讨论。
